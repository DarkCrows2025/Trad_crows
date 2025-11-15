window.docx = {
    parseDocx: async function(arrayBuffer) {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const xml = await zip.file("word/document.xml").async("text");

        const text = xml
            .replace(/<w:p[^>]*>/g, "\n")
            .replace(/<[^>]+>/g, "")
            .trim();

        return { text };
    }
};
