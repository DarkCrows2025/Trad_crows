async function processDocx() {
    const apiKey = document.getElementById("apiKey").value;
    const fileInput = document.getElementById("docxInput").files[0];
    const outputDiv = document.getElementById("output");

    if (!apiKey) {
        alert("Informe a chave da API!");
        return;
    }
    if (!fileInput) {
        alert("Selecione um arquivo DOCX!");
        return;
    }

    outputDiv.textContent = "Lendo arquivo DOCX…";

    try {
        // Ler o DOCX com Mammoth.js
        const arrayBuffer = await fileInput.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const originalHTML = result.value;

        outputDiv.textContent = "Enviando para GPT-5 Mini…";

        // Traduzir mantendo estilo literário e regras
        const translatedHTML = await traduzirComRegras(apiKey, originalHTML);

        outputDiv.textContent = "Gerando DOCX traduzido…";

        // Criar DOCX com docx.js
        const { Document, Paragraph, TextRun, Packer } = docx;
        const doc = new Document();

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = translatedHTML;

        tempDiv.querySelectorAll("p").forEach(p => {
            const paragraph = new Paragraph({
                children: Array.from(p.childNodes).map(node => {
                    if (node.nodeName === "STRONG" || node.nodeName === "B") {
                        return new TextRun({ text: node.textContent, bold: true });
                    } else if (node.nodeName === "EM" || node.nodeName === "I") {
                        return new TextRun({ text: node.textContent, italics: true });
                    } else {
                        return new TextRun({ text: node.textContent });
                    }
                })
            });
            doc.addSection({ children: [paragraph] });
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "Documento_Traduzido.docx");

        outputDiv.textContent = "Tradução concluída! DOCX gerado.";
    } catch (err) {
        outputDiv.textContent = "Erro: " + err;
    }
}

async function traduzirComRegras(apiKey, htmlText) {
    const prompt = `
Você é um tradutor literário profissional. Traduza o seguinte texto do inglês para português brasileiro seguindo **todas estas regras**:

1. Tradução fiel ao texto original; preserve o sentido literal.
2. Mantenha o estilo literário.
3. Preserve palavrões e cenas explícitas exatamente como no original.
4. Não use gírias; mantenha linguagem formal adequada.
5. Mantenha os tempos verbais e modos originais (passado, presente, futuro).
6. Preserve negritos e itálicos do DOCX original (representados por <strong>/<b> ou <em>/<i> no HTML).
7. Mantenha parágrafos, títulos e estrutura básica do texto.

Texto a ser traduzido (HTML preservando formatação):
${htmlText}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-5-mini",
            messages: [{ role: "user", content: prompt }]
        })
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
    } else {
        throw new Error("Nenhuma resposta da API");
    }
}
