const title = "Awesome Product™ (2023)";
const seoSlug = undefined;
const generatedSlug = seoSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
console.log("generated:", generatedSlug);

const urlSlug = generatedSlug;
const decodedSlug = decodeURIComponent(urlSlug);
const match = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === decodedSlug;
console.log("match:", match);
