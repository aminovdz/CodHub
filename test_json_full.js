const fs = require('fs');
const textOutput = `{
  "proposedAction": {
    "type": "UPDATE_LANDING_PAGE",
    "previewData": {
      "htmlBody": "<!DOCTYPE html>\\n<html lang=\\"ar\\" dir=\\"rtl\\">\\n<head>\\n    <meta charset=\\"UTF-8\\">\\n    <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\n    <title>كيس غسيل الأحذية للغسالة - حماية فائقة وتنظيف سهل | توصيل مجاني والدفع عند الاستلام في الجزائر</title>\\n    <meta name=\\"description\\" content=\\"احمِ أحذيتك من التلف أثناء الغسيل مع كيس غسيل الأحذية المتين. تنظيف عميق، حماية من التشوه، وتوصيل مجاني مع الدفع عند الاستلام في الجزائر.\\">\\n    <style>\\n        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');\\n        body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; background-color: #f8f8f8; color: #333; direction: rtl; text-align: right; }\\n        .container { max-width: 900px; margin: 0 auto; padding: 20px; }\\n        .hero { background-color: #fff; padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }\\n        .hero h1 { color: #0056b3; font-size: 36px; margin-bottom: 15px; line-height: 1.4; }\\n        .hero .subtitle { font-size: 22px; color: #555; margin-bottom: 25px; }\\n        .hero img { max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }\\n        .price-section { margin-bottom: 25px; }\\n        .old-price { text-decoration: line-through; color: #888; font-size: 24px; margin-left: 10px; display: inline-block; }\\n        .current-price { color: #e60000; font-size: 42px; font-weight: bold; display: inline-block; }\\n        .discount-badge { background-color: #e60000; color: #fff; padding: 8px 15px; border-radius: 5px; font-weight: bold; margin-right: 15px; display: inline-block; font-size: 18px; }\\n        .cta-button { display: block; width: fit-content; margin: 30px auto; padding: 18px 40px; background-color: #28a745; color: #fff; font-size: 28px; font-weight: bold; text-decoration: none; border-radius: 50px; transition: background-color 0.3s ease; border: none; cursor: pointer; box-shadow: 0 6px 20px rgba(40,167,69,0.4); }\\n        .cta-button:hover { background-color: #218838; transform: translateY(-2px); }\\n        .trust-badges { display: flex; justify-content: center; flex-wrap: wrap; gap: 20px; margin-top: 30px; }\\n        .trust-badge { background-color: #f0f0f0; padding: 15px 20px; border-radius: 8px; font-size: 18px; color: #333; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }\\n        .trust-badge strong { color: #0056b3; }\\n        .section { background-color: #fff; padding: 30px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }\\n        .section h2 { color: #0056b3; font-size: 30px; text-align: center; margin-bottom: 25px; position: relative; }\\n        .section h2::after { content: ''; display: block; width: 60px; height: 4px; background-color: #28a745; margin: 10px auto 0; border-radius: 2px; }\\n        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; text-align: right; }\\n        .feature-item { background-color: #f9f9f9; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }\\n        .feature-item h3 { color: #28a745; font-size: 22px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }\\n        .feature-item p { font-size: 17px; line-height: 1.6; color: #555; }\\n        .problem-solution p { font-size: 18px; line-height: 1.8; margin-bottom: 20px; }\\n        .problem-solution strong { color: #e60000; }\\n        .testimonials { margin-top: 30px; }\\n        .testimonial-item { background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-right: 5px solid #0056b3; }\\n        .testimonial-item p { font-style: italic; color: #444; font-size: 16px; line-height: 1.6; }\\n        .testimonial-item .author { text-align: left; margin-top: 10px; font-weight: bold; color: #0056b3; }\\n        .quantity-offers { text-align: center; margin-top: 30px; }\\n        .quantity-offers .offer-card { background-color: #e0ffe0; border: 2px solid #28a745; border-radius: 10px; padding: 25px; margin: 15px auto; max-width: 350px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }\\n        .quantity-offers .offer-card.popular { background-color: #fff3e0; border-color: #ff9800; }\\n        .quantity-offers .offer-card h3 { color: #28a745; font-size: 24px; margin-bottom: 10px; }\\n        .quantity-offers .offer-card.popular h3 { color: #ff9800; }\\n        .quantity-offers .offer-card .price { font-size: 36px; font-weight: bold; color: #e60000; margin-bottom: 10px; }\\n        .quantity-offers .offer-card .save-text { font-size: 18px; color: #555; margin-bottom: 15px; }\\n        .quantity-offers .offer-card .cta-small { background-color: #0056b3; color: #fff; padding: 12px 25px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 20px; display: inline-block; transition: background-color 0.3s ease; }\\n        .quantity-offers .offer-card .cta-small:hover { background-color: #004085; }\\n        .star-rating { color: #FFD700; font-size: 20px; margin-bottom: 10px; }\\n        .star-rating span { margin-left: 5px; }\\n        .reviews-count { font-size: 16px; color: #666; margin-bottom: 20px; }\\n        .sold-count { font-size: 16px; color: #666; margin-bottom: 20px; }\\n        .guarantee { background-color: #e9f7ef; padding: 25px; border-radius: 10px; text-align: center; margin-top: 30px; border: 1px solid #28a745; }\\n        .guarantee h3 { color: #28a745; font-size: 24px; margin-bottom: 10px; }\\n        .guarantee p { font-size: 18px; line-height: 1.6; color: #444; }\\n\\n        @media (max-width: 768px) {\\n            .hero h1 { font-size: 28px; }\\n            .hero .subtitle { font-size: 18px; }\\n            .current-price { font-size: 36px; }\\n            .old-price { font-size: 20px; }\\n            .discount-badge { font-size: 16px; padding: 6px 12px; }\\n            .cta-button { font-size: 24px; padding: 15px 30px; }\\n            .trust-badge { font-size: 16px; padding: 12px 15px; }\\n            .section h2 { font-size: 26px; }\\n            .feature-item h3 { font-size: 20px; }\\n            .feature-item p { font-size: 16px; }\\n            .problem-solution p { font-size: 16px; }\\n            .quantity-offers .offer-card { max-width: 100%; }\\n            .quantity-offers .offer-card .price { font-size: 30px; }\\n            .quantity-offers .offer-card .cta-small { font-size: 18px; padding: 10px 20px; }\\n        }\\n    </style>\\n</head>\\n<body>\\n    <div class=\\"container\\">\\n        <div class=\\"hero\\">\\n            <h1>وداعاً للأحذية التالفة في الغسالة! 👋</h1>\\n            <p class=\\"subtitle\\">احمِ أحذيتك المفضلة وحافظ على نظافتها بسهولة مع كيس الغسيل الذكي!</p>\\n            <img src=\\"https://ae-pic-a1.aliexpress-media.com/kf/S282ad8f6e61c46a890d64200be109615R.jpg_960x960q75.jpg_.avif\\" alt=\\"كيس غسيل الأحذية للغسالة\\">\\n            \\n            <div class=\\"price-section\\">\\n                <span class=\\"discount-badge\\">خصم 39%</span>\\n                <span class=\\"current-price\\">790 دج</span>\\n                <span class=\\"old-price\\">1290 دج</span>\\n            </div>\\n            \\n            <div class=\\"star-rating\\">\\n                ⭐⭐⭐⭐⭐ <span>(4.8 نجوم من 123 تقييم)</span>\\n            </div>\\n            <p class=\\"sold-count\\">أكثر من 10,000 قطعة مباعة!</p>\\n\\n            <a href=\\"#order-section\\" class=\\"cta-button\\">اطلب الآن واستفد من العرض!</a>\\n\\n            <div class=\\"trust-badges\\">\\n                <div class=\\"trust-badge\\">🚚 <strong>توصيل مجاني</strong> لكل ولايات الجزائر</div>\\n                <div class=\\"trust-badge\\">💰 <strong>الدفع عند الاستلام</strong> - لا تدفع حتى تستلم!</div>\\n                <div class=\\"trust-badge\\">🛡️ <strong>ضمان الرضا التام</strong></div>\\n            </div>\\n        </div>\\n\\n        <div class=\\"section problem-solution\\">\\n            <h2>هل تعبت من غسل الأحذية يدوياً أو خوفاً من تلفها في الغسالة؟</h2>\\n            <p>في الجزائر، حيث الأتربة والنشاط اليومي، تتسخ الأحذية بسرعة وتحتاج لتنظيف مستمر. لكن غسلها يدوياً مرهق ويستغرق وقتاً طويلاً، ووضعها في الغسالة مباشرة قد يؤدي إلى <strong>تشوهها وتلفها</strong>، خاصة الأحذية الرياضية الغالية. لا داعي للقلق بعد الآن!</p>\\n            <p>نقدم لك الحل الأمثل: <strong>كيس غسيل الأحذية المتين للغسالة</strong>، المصمم خصيصاً لحماية أحذيتك الثمينة مع ضمان نظافة فائقة!</p>\\n        </div>\\n\\n        <div class=\\"section\\">\\n            <h2>✨ لماذا كيس غسيل الأحذية هو خيارك الأفضل؟</h2>\\n            <div class=\\"features-grid\\">\\n                <div class=\\"feature-item\\">\\n                    <h3>👟 حماية فائقة من التشوه</h3>\\n                    <p>تصميم مبطن بألياف ناعمة يحمي أحذيتك من الاصطدام بأسطوانة الغسالة ويمنع أي تشوه أو خدوش، لتحافظ على شكلها الأصلي.</p>\\n                </div>\\n                <div class=\\"feature-item\\">\\n                    <h3>🧼 تنظيف عميق وفعال</h3>\\n                    <p>مزود بفرشاة تنظيف مدمجة تساعد على إزالة الأوساخ العنيدة من الأماكن الصعبة، لضمان نظافة لا مثيل لها.</p>\\n                </div>\\n                <div class=\\"feature-item\\">\\n                    <h3>🔒 سحاب قوي وآمن</h3>\\n                    <p>سحاب متين وموثوق يضمن بقاء الحذاء داخل الكيس طوال دورة الغسيل، فلا تقلق من خروجه أو تلفه.</p>\\n                </div>\\n                <div class=\\"feature-item\\">\\n                    <h3>🌬️ تصميم شبكي متنفس</h3>\\n                    <p>يسمح بدخول الماء والصابون بسهولة لغسل فعال، مع الحفاظ على تهوية الحذاء وحمايته من الخدوش.</p>\\n                </div>\\n                <div class=\\"feature-item\\">\\n                    <h3>✈️ خفيف الوزن ومحمول</h3>\\n                    <p>بمقاس مثالي (39×19 سم)، يمكنك حمله وتخزينه بسهولة، مما يجعله رفيقك المثالي في السفر والرحلات.</p>\\n                </div>\\n                <div class=\\"feature-item\\">\\n                    <h3>♻️ قابل لإعادة الاستخدام</h3>\\n                    <p>مصنوع من البوليستر النايلون عالي الجودة، يتحمل الغسل المتكرر دون تلف، ليدوم معك طويلاً.</p>\\n                </div>\\n            </div>\\n        </div>\\n\\n        <div class=\\"section testimonials\\">\\n            <h2>ماذا يقول زبائننا؟</h2>\\n            <div class=\\"testimonial-item\\">\\n                <p>\\"وصلني البارح وغسلت فيه زوج أحذية مختلفة، الكيس هذا هايل! الأحذية خرجت نظيفة وما تضررتش خلاص.\\"</p>\\n                <p class=\\"author\\">- O***n من الجزائر</p>\\n            </div>\\n            <div class=\\"testimonial-item\\">\\n                <p>\\"كان عندي منو من قبل، وراني نشري أكثر. نحب نستعملو لغسل الأحذية الرياضية في الغسالة؛ ينظف مليح وما يتضرروش الأحذية بزاف خاطر الكيس يحميهم.\\"</p>\\n                <p class=\\"author\\">- r***o من الجزائر</p>\\n            </div>\\n            <div class=\\"testimonial-item\\">\\n                <p>\\"هايل بزاف، استعملتو في دورة غسيل ساعة على 800 دورة في الدقيقة، والأحذية خرجت نظيفة. ما جربتوش للتنشيف؛ خليتهم في الشمس. راني نطلب زوج آخرين.\\"</p>\\n                <p class=\\"author\\">- زبون من الجزائر</p>\\n            </div>\\n        </div>\\n\\n        <div class=\\"section quantity-offers\\" id=\\"order-section\\">\\n            <h2>اغتنم الفرصة الآن! عروض خاصة لفترة محدودة!</h2>\\n            <div class=\\"offer-card\\">\\n                <h3>عرض الكيس الواحد</h3>\\n                <p class=\\"price\\">790 دج</p>\\n                <p class=\\"save-text\\">وفر 500 دج!</p>\\n                <a href=\\"#\\" class=\\"cta-small\\">اطلب كيس واحد الآن</a>\\n            </div>\\n            <div class=\\"offer-card popular\\">\\n                <h3>الأكثر شعبية: عرض كيسين</h3>\\n                <p class=\\"price\\">1390 دج</p>\\n                <p class=\\"save-text\\">وفر 190 دج إضافية! (الكيس الواحد بـ 695 دج)</p>\\n                <a href=\\"#\\" class=\\"cta-small\\">اطلب كيسين الآن</a>\\n            </div>\\n            <div class=\\"offer-card\\">\\n                <h3>عرض العائلة: 3 أكياس</h3>\\n                <p class=\\"price\\">1990 دج</p>\\n                <p class=\\"save-text\\">وفر 380 دج إضافية! (الكيس الواحد بـ 663 دج)</p>\\n                <a href=\\"#\\" class=\\"cta-small\\">اطلب 3 أكياس الآن</a>\\n            </div>\\n            <p style=\\"margin-top: 30px; font-size: 18px; color: #e60000; font-weight: bold;\\">الكمية محدودة جداً! لا تفوت الفرصة!</p>\\n        </div>\\n\\n        <div class=\\"section guarantee\\">\\n            <h3>ضمان الرضا التام 100%</h3>\\n            <p>نحن واثقون من جودة منتجاتنا. إذا لم تكن راضياً تماماً عن كيس غسيل الأحذية، يمكنك إرجاع المنتج واستعادة أموالك كاملة خلال 7 أيام، بدون أي أسئلة!</p>\\n        </div>\\n\\n        <div class=\\"hero\\" style=\\"background-color: #f8f8f8; box-shadow: none;\\">\\n            <a href=\\"#order-section\\" class=\\"cta-button\\">نظافة وحماية لأحذيتك بضغطة زر! اطلب الآن!</a>\\n        </div>\\n    </div>\\n</body>\\n</html>"
    }
  },
  "message": "أهلاً بك! 👋

لقد قمت بتحليل بيانات المنتج الخاص بك \\"كيس غسيل الأحذية للغسالة\\" من متجرك ومن AliExpress، وصممت لك صفحة هبوط احترافية ومُحسّنة خصيصًا للسوق الجزائري باللغة العربية.

**النقاط الرئيسية في صفحة الهبوط المقترحة:**

*   **عنوان جذاب ومحفز:** يبدأ بمعالجة مشكلة شائعة (تلف الأحذية في الغسالة) ويقدم الحل مباشرة.
*   **صور عالية الجودة:** تم استخدام الصورة الرئيسية للمنتج بشكل بارز.
*   **الأسعار والعروض:** تم عرض السعر المخفض (790 دج بدلاً من 1290 دج) بشكل واضح مع إبراز نسبة الخصم (39%).
*   **إثبات اجتماعي قوي:** تم إبراز التقييمات العالية (4.8 نجوم) وعدد المبيعات الكبير (أكثر من 10,000 قطعة مباعة) لزيادة الثقة.
*   **أزرار دعوة للإجراء (CTA) واضحة:** \\"اطلب الآن واستفد من العرض!\\" و \\"اطلب الآن!\\" بألوان بارزة وتصميم جذاب.
*   **عوامل بناء الثقة الجزائرية:** تم التأكيد على \\"توصيل مجاني لكل ولايات الجزائر\\" و \\"الدفع عند الاستلام\\" و \\"ضمان الرضا التام\\" بشكل بارز، وهي نقاط حاسمة للمستهلك الجزائري.
*   **معالجة المشكلة والحل (PAS Framework):** تبدأ الصفحة بتسليط الضوء على مشكلة غسل الأحذية وتلفها، ثم تقدم المنتج كحل مثالي.
*   **الميزات والفوائد:** تم تفصيل الميزات الرئيسية للمنتج (حماية من التشوه، تنظيف عميق، سحاب قوي، تصميم متنفس، قابلية الحمل، إعادة الاستخدام) مع التركيز على الفوائد التي تعود على الزبون.
*   **شهادات العملاء:** تم تضمين شهادات حقيقية (مترجمة ومكيفة من AliExpress) لتعزيز المصداقية.
*   **عروض الكمية المحسّنة:** لقد قمت بتعديل عروض الكمية لتكون أكثر جاذبية ومنطقية (خصم عند شراء أكثر من كيس واحد)، حيث كانت العروض الأصلية غير صحيحة. الآن تشجع على زيادة متوسط قيمة الطلب (AOV).
*   **ضمان استعادة الأموال:** لزيادة الثقة وتقليل المخاطر لدى المشتري.
*   **تصميم متجاوب:** HTML مصمم ليعمل بشكل جيد على مختلف الأجهزة (الجوال والكمبيوتر).

**ملاحظة هامة حول عروض الكمية:**
لقد لاحظت أن عروض الكمية في بيانات متجرك كانت غير منطقية (سعر الكيسين أعلى من ضعف سعر الكيس الواحد). لذلك، قمت باقتراح عروض جديدة تعطي خصماً حقيقياً عند شراء كميات أكبر، مما يشجع الزبائن على الشراء ويزيد من قيمة طلباتهم. يرجى مراجعة هذه العروض وتحديثها في متجرك لتعكس خصومات حقيقية.

أتمنى أن تساعدك صفحة الهبوط هذه في تحقيق أفضل معدلات التحويل! 🚀"
}`;

function fixJson(text) {
  let jsonString = text;
  const firstBrace = jsonString.indexOf('{');
  if (firstBrace !== -1) {
    jsonString = jsonString.slice(firstBrace);
  }

  let inString = false;
  let escapedJson = "";
  let openBraces = 0;
  let openBrackets = 0;
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
      inString = !inString;
    }
    
    if (inString) {
      if (char === '\n') escapedJson += '\\n';
      else if (char === '\r') escapedJson += '\\r';
      else if (char === '\t') escapedJson += '\\t';
      else escapedJson += char;
    } else {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
      
      escapedJson += char;
    }
  }

  if (inString) {
    escapedJson += '"';
  }

  while (openBrackets > 0) {
    escapedJson += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    escapedJson += '}';
    openBraces--;
  }

  escapedJson = escapedJson.replace(/,(\s*[}\]])/g, '$1');

  return escapedJson;
}

try {
  const fixed = fixJson(textOutput);
  console.log("Fixed JSON extracted successfully");
  JSON.parse(fixed);
  console.log("Parse SUCCESS");
} catch(e) {
  console.log("Parse FAILED", e.message);
  
  // Print exactly where it failed
  const match = e.message.match(/at position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    const fixed = fixJson(textOutput);
    console.log("Context around failure:", fixed.substring(pos - 20, pos + 20));
  }
}
