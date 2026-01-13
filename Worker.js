import { Buffer } from 'node:buffer';

export default {
  async fetch(request, env) {
    // 1. CORS Headers (Zodat je website mag praten met deze API)
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
      
      // --- DATA UIT FORMULIER HALEN ---
      const kenteken = formData.get("Kenteken") || "Onbekend";
      const klantType = formData.get("Klant_Type") || "-";
      const typeWerk = formData.get("Type_Werk") || "-";
      const opmerkingen = formData.get("Opmerkingen") || "Geen opmerkingen";
      const sterren = formData.get("Aantal_Sterren");
      
      // Contactgegevens (worden meestal alleen via de website meegestuurd)
      const naam = formData.get("Naam");
      const email = formData.get("Email");
      const telefoon = formData.get("Telefoon");

      // Check: Is dit een schademelding van de website of een werkbon van een monteur?
      // Als er een 'Naam' is ingevuld, gaan we er vanuit dat het een klant is (website).
      const isSchadeMelding = !!naam;
      const titel = isSchadeMelding ? "Online Schademelding" : "Werkbon";

      // --- EMAIL HTML BOUWEN ---
      
      // 1. Checklist items (alleen de "Ja" vinkjes tonen)
      let checklistHtml = "";
      for (const [key, value] of formData.entries()) {
        // We filteren de standaard velden eruit, zodat alleen de checklist items overblijven
        if (value === "Ja" && !["Kenteken", "Klant_Type", "Type_Werk", "Opmerkingen", "Aantal_Sterren", "Naam", "Email", "Telefoon"].includes(key)) {
          const cleanKey = key.replace(/_/g, ' ');
          checklistHtml += `<li style="margin-bottom: 5px;"><span style="color: #27ae60; font-weight: bold;">✓</span> ${cleanKey}</li>`;
        }
      }

      // 2. Contactblok (Alleen tonen bij schademelding)
      let contactHtml = "";
      if (isSchadeMelding) {
        contactHtml = `
          <div style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; margin-bottom: 15px; color: #005CAB; font-size: 18px; font-weight: bold;">Contactgegevens</div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #E30613; margin-bottom: 10px;">
              <strong>Naam:</strong> ${naam}<br>
              <strong>Email:</strong> <a href="mailto:${email}" style="color: #005CAB;">${email}</a><br>
              <strong>Telefoon:</strong> ${telefoon}
          </div>
        `;
      }

      // 3. De complete email template
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #005CAB; text-align: center; margin-bottom: 5px;">${titel}</h1>
          <h2 style="text-align: center; color: #333; margin-top: 0; font-size: 24px;">${kenteken}</h2>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          
          ${contactHtml}

          <div style="margin-bottom: 20px;">
            <strong>Type Werk:</strong> ${typeWerk} ${sterren ? `(${sterren} Sterren)` : ''}<br>
            <strong>Klant Type:</strong> ${klantType}
          </div>

          ${checklistHtml ? `<h3>Checklist</h3><ul>${checklistHtml}</ul>` : ''}

          <h3>Opmerkingen</h3>
          <p style="background: #fff8e1; padding: 15px; border-radius: 5px; font-style: italic; color: #555;">"${opmerkingen}"</p>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
            Verzonden via Autoglas Pro Systeem<br>
            Powered by Spectux.com
          </p>
        </div>
      </body>
      </html>
      `;

      // --- BIJLAGEN VOORBEREIDEN VOOR BREVO ---
      const attachments = [];
      const files = formData.getAll("attachment");
      
      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          // Brevo verwacht de inhoud als Base64 string
          const base64Content = Buffer.from(arrayBuffer).toString('base64');
          
          attachments.push({
            name: file.name,
            content: base64Content
          });
        }
      }

      // --- VERSTUREN VIA BREVO API ---
      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY,  // Zorg dat deze in Cloudflare Variables staat!
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          // AFZENDER: Dit adres MOET geverifieerd zijn in Brevo ("Senders & IP")
          sender: { 
            name: "Autoglas Pro Systeem", 
            email: "info@spectux.com" 
          }, 
          // ONTVANGER: Hier gaat de mail naartoe
          to: [
            { 
              email: "timosteen22@gmail.com", 
              name: "Autoglas Pro Administratie" 
            }
          ], 
          subject: `${titel}: ${kenteken} ${naam ? '- ' + naam : ''}`,
          htmlContent: htmlContent,
          attachment: attachments
        }),
      });

      if (!brevoResponse.ok) {
        const errorData = await brevoResponse.text();
        // Gooi een error zodat de frontend weet dat het mis ging
        throw new Error(`Brevo Error: ${errorData}`);
      }

      // Succes!
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      // Fout afhandeling
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
