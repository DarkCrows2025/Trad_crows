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

    outputDiv.innerHTML = "Lendo arquivo DOCX…";

    try {
        // Ler o DOCX com Mammoth.js
        const arrayBuffer = await fileInput.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const originalHTML = result.value;

        outputDiv.innerHTML = "Enviando para GPT-5 Mini…";

        // Chamar a LLM
        const translatedHTML = await callLLM(apiKey, originalHTML);

        outputDiv.innerHTML = "Gerando DOCX traduzido…";

        // Criar DOCX com docx.js
        const doc = new docx.Document();

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = translatedHTML;

        // Cada parágrafo HTML → Paragraph docx
        tempDiv.querySelectorAll("p").forEach(p => {
            const paragraph = new docx.Paragraph({
                children: Array.from(p.childNodes).map(node => {
                    if (node.nodeName === "STRONG" || node.nodeName === "B") {
                        return new docx.TextRun({ text: node.textContent, bold: true });
                    } else if (node.nodeName === "EM" || node.nodeName === "I") {
                        return new docx.TextRun({ text: node.textContent, italics: true });
                    } else {
                        return new docx.TextRun({ text: node.textContent });
                    }
                })
            });
            doc.addSection({ children: [paragraph] });
        });

        const blob = await docx.Packer.toBlob(doc);
        saveAs(blob, "traduzido.docx");

        outputDiv.innerHTML = "Pronto! Arquivo DOCX traduzido baixado.";

    } catch (err) {
        console.error(err);
        alert("Erro ao processar o documento. Veja o console.");
    }
}

async function callLLM(apiKey, originalHTML) {
    const rules = `
INSTRUÇÕES PARA TRADUÇÃO LITERÁRIA:

1 — Traduzir textos do inglês fielmente para o português brasileiro fluidamente, com melhor entendimento. Pode alterar palavras ou frases para dar mais sentido, mas sem alterar o sentido ORIGINAL. Converter unidades para o formato brasileiro.
2 — Manter palavrões e cenas explícitas.
3 — Em capítulos, colocar os números em extenso (Ex.: Capítulo 1 → Capítulo Um).
4 — Não deixar palavras em inglês, exceto nomes próprios, cidades, estados, etc.
5 — Manter tempo e modo verbal do texto como no original.
6 — Não usar gírias brasileiras nem tornar o texto abrasileirado. Manter gramática correta.
7 — Revisar o texto minuciosamente para garantir precisão e consistência.
8 — Adaptar "sift", "glamoured" e "apparate" para português, mantendo sentido e tom fantástico.
9 — Adaptar outros termos de fantasia de forma criativa, fluida e mantendo imersão.
10 — Manter itálicos e formatação original para Word.
11 — Nunca substituir aspas por travessões.
12 — Retorne apenas o HTML traduzido, sem explicações ou tags extras.
`;

    const payload = {
        model: "gpt-5-mini",
        input: rules + "\n\n---CONTEÚDO_HTML---\n\n" + originalHTML
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    const translated =
        (data.output_text && String(data.output_text).trim()) ||
        (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text) ||
        (data.choices?.[0]?.message?.content) ||
        "";

    return translated.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "");
}
