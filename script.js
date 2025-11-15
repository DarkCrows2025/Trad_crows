async function start() {
    const apiKey = document.getElementById("apiKey").value;
    const file = document.getElementById("fileInput").files[0];
    const rules = JSON.parse(document.getElementById("rules").value);
    const status = document.getElementById("status");

    if (!apiKey) return alert("API Key é obrigatória!");
    if (!file) return alert("Selecione um arquivo DOCX!");

    status.innerText = "Lendo DOCX...";

    const arrayBuffer = await file.arrayBuffer();
    const doc = await window.docx.parseDocx(arrayBuffer);  
    const originalText = doc.text;

    let processed = originalText;
    for (const [from, to] of Object.entries(rules.substituicoes_pre)) {
        processed = processed.replaceAll(from, to);
    }

    const chunks = chunkText(processed, 6000);
    status.innerText = `Traduzindo... (0/${chunks.length})`;

    let translated = "";

    for (let i = 0; i < chunks.length; i++) {
        const part = await translateChunk(apiKey, chunks[i], rules);
        translated += part + "\n";
        status.innerText = `Traduzindo... (${i + 1}/${chunks.length})`;
    }

    for (const [from, to] of Object.entries(rules.substituicoes_pos)) {
        translated = translated.replaceAll(from, to);
    }

    status.innerText = "Gerando DOCX...";

    const output = await buildDocx(translated);
    saveAs(output, "traduzido.docx");

    status.innerText = "Concluído!";
}

function chunkText(text, size) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += size;
    }
    return chunks;
}

async function translateChunk(apiKey, text, rules) {
    const body = {
        model: "gpt-5-mini",
        input: `
Translate the text to English.
Tone: ${rules.tom}
Text:
${text}
`
    };

    const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    return data.output_text || "";
}
