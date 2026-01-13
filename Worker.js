import { Buffer } from 'node:buffer';

export default {
  async fetch(request, env) {
    // 1. CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const formData = await request.formData();
      
      // --- DATA OPHALEN ---
      const kenteken = formData.get("Kenteken") || "Onbekend";
      const klantType = formData.get("Klant_Type") || "-";
      const typeWerk = formData.get("Type_Werk") || "-";
      const opmerkingen = formData.get("Opmerkingen") || "Geen opmerkingen";
      const sterren = formData.get("Aantal_Sterren");
      
      // Specifieke velden voor Schademelding
      const naam = formData.get("Naam");
      const email = formData.get("Email");
      const telefoon = formData.get("Telefoon");

      // Bepaal titel: Als er een Naam is ingevuld, is het waarschijnlijk een Schademelding via de site
      const isSchadeMelding = !!naam;
      const titel = isSchadeMelding ? "Online Schademelding" : "Werkbon";
      const subTitel = isSchadeMelding ? "Nieuwe aanvraag via website" : "Interne werkorder";

      // --- HTML BOUWEN ---
      
      // 1. Checklist opbouwen (alleen de "Ja" vinkjes)
      let checklistHtml = "";
      for (const [key, value] of formData.entries()) {
        // Filter de standaard velden eruit zodat ze niet dubbel in de checklist komen
        if (value === "Ja" && !["Kenteken", "Klant_Type", "Type_Werk", "Opmerkingen", "Aantal_Sterren", "Naam", "Email", "Telefoon", "access_key"].includes(key)) {
          const cleanKey = key.replace(/_/g, ' ');
          checklistHtml += `
            <li style="margin-bottom: 5px;">
              <span style="color: #27ae60; font-weight: bold;">✓</span> ${cleanKey}
            </li>`;
        }
      }

      // 2. Contact Blok (Alleen tonen bij schademelding)
      let contactHtml = "";
      if (isSchadeMelding) {
        contactHtml = `
          <div class="section-title">Contactgegevens</div>
          <div class="grid">
            <div class="info-block">
              <span class="label">Naam</span>
              <div class="value" style="font-size: 16px;">${naam}</div>
            </div>
            <div class="info-block">
              <span class="label">Telefoon</span>
              <div class="value" style="font-size: 16px;">${telefoon || "-"}</div>
            </div>
          </div>
          <div class="info-block" style="margin-top: -10px;">
             <span class="label">E-mailadres</span>
             <div class="value" style="font-size: 16px;"><a href="mailto:${email}" style="color: #005CAB;">${email || "-"}</a></div>
          </div>
        `;
      }

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { background-color: ${isSchadeMelding ? '#E30613' : '#005CAB'}; color: #ffffff; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
          .badge { background-color: #E30613; color: white; padding: 5px 10px; border-radius: 4px; font-size: 14px; font-weight: bold; vertical-align: middle; }
          .content { padding: 30px; color: #333333; line-height: 1.6; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-block { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid ${isSchadeMelding ? '#E30613' : '#005CAB'}; margin-bottom: 10px; }
          .label { font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 4px; }
          .value { font-size: 18px; font-weight: bold; color: #1a1a1a; }
          .section-title { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; margin-bottom: 15px; color: #005CAB; font-size: 18px; font-weight: bold; }
          .remarks { background-color: #fff8e1; border: 1px solid #ffe0b2; padding: 15px; border-radius: 6px; color: #795548; font-style: italic; }
          .footer { background-color: #333333; color: #888888; text-align: center; padding: 20px; font-size: 12px; }
          .footer a { color: #ffffff; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${titel}</h1>
            <div style="margin-top: 10px; opacity: 0.9;">${kenteken}</div>
          </div>

          <div class="content">
            ${contactHtml}

            <div class="section-title">Voertuig & Status</div>
            <div class="grid">
               <div class="info-block">
                <span class="label">Klant Type</span>
                <div class="value" style="font-size: 16px;">${klantType}</div>
              </div>
              <div class="info-block">
                <span class="label">Type Schade</span>
                <div class="value" style="font-size: 16px;">
                  ${sterren ? `${sterren} Ster(ren)` : typeWerk}
                </div>
              </div>
            </div>

            <div class="section-title">Bericht van Klant</div>
            <div class="remarks">
              "${opmerkingen}"
            </div>
            
            ${checklistHtml ? `<div class="section-title">Details</div><ul style="list-style: none; padding: 0; margin: 0;">${checklistHtml}</ul>` : ''}

            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              <em>Zie bijlagen voor de gemaakte foto's.</em>
            </p>
          </div>

          <div class="footer">
            Verzonden via Autoglas Pro Website<br><br>
            Powered by <a href="https://spectux.com">Spectux.com</a>
          </div>
        </div>
      </body>
      </html>
      `;

      // Attachments
      const attachments = [];
      const files = formData.getAll("attachment");
      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          attachments.push({
            filename: file.name,
            content: Buffer.from(arrayBuffer),
          });
        }
      }

      // Versturen
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Autoglas Pro Melding <onboarding@resend.dev>", 
          to: ["Timosteen22@gmail.com"], 
          subject: `${titel}: ${kenteken} (${naam || 'Monteur'})`,
          html: htmlContent,
          attachments: attachments
        }),
      });

      if (!resendResponse.ok) throw new Error(await resendResponse.text());

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
