async function buildDocx(text) {
    const { Document, Packer, Paragraph } = docx;

    const paragraphs = text.split("\n").map(
        line => new Paragraph(line)
    );

    const doc = new Document({ sections: [{ children: paragraphs }] });

    return await Packer.toBlob(doc);
}
