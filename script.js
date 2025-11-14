// script.js — versão atualizada com suas regras literais para a LLM (gpt-5-mini)

async function processDocx() {
    const apiKey = document.getElementById("apiKey").value;
    const fileInput = document.getElementById("docxInput").files[0];

    if (!apiKey) {
        alert("Informe a chave da API!");
        return;
    }
    if (!fileInput) {
        alert("Selecione um arquivo DOCX!");
        return;
    }

    try {
        // Ler o arquivo DOCX como ArrayBuffer
        const arrayBuffer = await fileInput.arrayBuffer();

        // Abrir como ZIP e pegar o documento XML
        const zip = await JSZip.loadAsync(arrayBuffer);
        const xml = await zip.file("word/document.xml").async("string");

        // Converter o XML DOCX para HTML usando docx.js
        // (docx.parseDocumentXml vem do docx.js carregado no index.html)
        const html = window.docx.parseDocumentXml(xml);

        // Pequeno ajuste para ter quebras de linha legíveis
        const cleanedHtml = preserveFormatting(html);

        // Enviar para a LLM traduzir com suas regras
        const translated = await callLLM(apiKey, cleanedHtml);

        // Exibir resultado (HTML)
        document.getElementById("output").innerHTML = translated;

    } catch (err) {
        console.error(err);
        alert("Erro ao processar o documento. Veja o console para detalhes.");
    }
}

// Mantém <p>, <em>, <strong> etc. intactos e organiza quebras
function preserveFormatting(html) {
    return html
        .replace(/<\/p>\s*<p>/g, "</p>\n<p>")
        .replace(/\r\n|\r/g, "\n");
}

// Função que chama a API e envia o prompt com suas regras
async function callLLM(apiKey, originalHTML) {

    // Regras exatas enviadas para a LLM — formatadas de modo claro e instrutivo
    const rules = `
INSTRUÇÕES GERAIS (Siga estritamente, passo a passo):
Você é um tradutor profissional de inglês para português brasileiro especializado em tradução literária. Traduza o conteúdo HTML que será fornecido, obedecendo rigorosamente às regras numeradas abaixo.

REGRAS:
1) Traduza fielmente do inglês para o português brasileiro, com fluidez e melhor compreensão. Você pode alterar palavras ou frases para dar mais sentido no PT-BR, **mas NUNCA altere o sentido original**. Converta unidades imperiais para o sistema métrico (ex.: inches → cm, feet → m, miles → km, pounds → kg, Fahrenheit → Celsius) e apresente valores no formato brasileiro (vírgula como separador decimal, ponto como separador de milhares quando necessário).

2) Mantenha palavrões e cenas explícitas sem censura. Eles fazem parte da licença poética da obra.

3) Em títulos de capítulos, escreva os números por extenso em PT-BR (Ex.: "Capítulo 1" → "Capítulo Um"). Aplique isto sempre que detectar marcações típicas de capítulo (por exemplo "Chapter 1", "Capítulo 1", "CHAPTER 1").

4) Não deixe palavras em inglês, exceto nomes próprios, topônimos (cidades, estados, países, marcas) ou siglas que devam ficar em inglês por convenção.

5) Não altere tempo e modo verbal do texto; preserve-os como no original. Faça apenas ajustes gramaticais necessários para o PT-BR.

6) Não use gírias brasileiras ou linguagem excessivamente abrasileirada. Evite "tô", "tá", "vc" etc. Mantenha gramática correta e um registro que respeite o tom do original.

7) Revise o texto durante a tradução para garantir precisão, consistência e conformidade com todas as regras acima.

8) Sempre que aparecerem as palavras "sift", "glamoured" e "apparate", adapte-as para o PT-BR com termos que melhor se encaixem no contexto e preservem o tom fantástico (ex.: "sift" → "deslizar" / "filtrar-se"; "glamoured" → "encantado" / "disfarçado por magia"; "apparate" → "teletransportar-se" / "materializar-se"). Escolha a opção que preserve a intenção descritiva.

9) Para termos de fantasia/paranormal sem tradução literal, adapte criativamente de forma fluida para o PT-BR, mantendo sentido, tom e imersão narrativa.

10) Mantenha itálico (<em>, <i>) e negrito (<strong>, <b>) exatamente como no original. Preserve toda a formatação HTML. Ao final, o HTML retornado deve manter as tags necessárias para que, ao colar no Word, a formatação permaneça (itálico, negrito, parágrafos).

11) NUNCA substitua aspas por travessões. Preserve aspas nas falas e pontuação original.

12) Saída esperada: RETORNE APENAS o HTML traduzido. **Sem explicações, sem metadados, sem comentários**, somente o HTML traduzido contendo as mesmas tags estruturais do original (<p>, <em>, <strong>, <h1>, etc.). Não adicione novas tags ou atributos.

INSTRUÇÕES TÉCNICAS:
- Traduza somente o texto dentro das tags. Não remova nem reordene as tags.
- Se houver elementos de título indicando capítulo, aplique a regra de números por extenso conforme a regra 3.
- Converta unidades para o sistema métrico e apresente com notação brasileira (vírgula decimal).
- Preserve diálogos entre aspas tal como aparecem; não mude travessões nem substitua aspas.
`;

    // Monta o payload final enviado para a API (originalHTML contém as tags)
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

    // Extrair texto de saída — manuseio compatível com diferentes formatos da API
    const translated =
        (data.output_text && String(data.output_text).trim()) ||
        (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text) ||
        (data.choices?.[0]?.message?.content) ||
        "";

    // Se a LLM por acaso incluir marcadores extras (como ```html```), removemos-os
    let cleaned = translated
        .replace(/^```(?:html)?\s*/i, "")
        .replace(/\s*```$/i, "");

    // Retorna o HTML limpo
    return cleaned;
}
