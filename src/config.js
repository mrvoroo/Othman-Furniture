// ⚠️ ضع رقم الواتساب هنا بصيغة دولية بدون + أو أصفار (مثال الكويت: 965XXXXXXXX)
export const WHATSAPP = '96500000000';
export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
