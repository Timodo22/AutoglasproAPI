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
      
      const naam = formData.get("Naam");
      const email = formData.get("Email");
      const telefoon = formData.get("Telefoon");

      const isSchadeMelding = !!naam;
      const titel = isSchadeMelding ? "Online Schademelding" : "Werkbon";

      // --- HTML BOUWEN ---
      let checklistHtml = "";
      for (const [key, value] of formData.entries()) {
        if (value === "Ja" && !["Kenteken", "Klant_Type", "Type_Werk", "Opmerkingen", "Aantal_Sterren", "Naam", "Email", "Telefoon"].includes(key)) {
          const cleanKey = key.replace(/_/g, ' ');
          checklistHtml += `<li style="margin-bottom: 5px;"><span style="color: #27ae60; font-weight: bold;">✓</span> ${cleanKey}</li>`;
        }
      }

      let contactHtml = "";
      if (isSchadeMelding) {
        contactHtml = `
          <div style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; margin-bottom: 15px; color: #005CAB; font-size: 18px; font-weight: bold;">Contactgegevens</div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #E30613; margin-bottom: 10px;">
              <strong>Naam:</strong> ${naam}<br>
              <strong>Email:</strong> <a href="mailto:${email}">${email}</a><br>
              <strong>Telefoon:</strong> ${telefoon}
          </div>
        `;
      }

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #005CAB; text-align: center;">${titel}</h1>
          <h2 style="text-align: center; color: #333;">${kenteken}</h2>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          
          ${contactHtml}

          <div style="margin-bottom: 20px;">
            <strong>Type Werk:</strong> ${typeWerk} ${sterren ? `(${sterren} Sterren)` : ''}<br>
            <strong>Klant Type:</strong> ${klantType}
          </div>

          ${checklistHtml ? `<h3>Checklist</h3><ul>${checklistHtml}</ul>` : ''}

          <h3>Opmerkingen</h3>
          <p style="background: #fff8e1; padding: 15px; border-radius: 5px; font-style: italic;">"${opmerkingen}"</p>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
            Verzonden via Autoglas Pro Systeem<br>
            Powered by Spectux.com
          </p>
        </div>
      </body>
      </html>
      `;

      // --- ATTACHMENTS VOOR RESEND ---
      const attachments = [];
      const files = formData.getAll("attachment");
      
      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          // Resend gebruikt Buffer (geen Base64 string nodig zoals Brevo)
          const buffer = Buffer.from(arrayBuffer);
          
          attachments.push({
            filename: file.name,
            content: buffer
          });
        }
      }

      // --- VERSTUREN VIA RESEND API ---
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // LET OP: Zolang je domein 'Pending' is, gebruik "onboarding@resend.dev".
          // Zodra je domein 'Verified' is, verander dit naar: "Autoglas Pro <info@autoglaspro.nl>"
          from: "Autoglas Pro <info@autoglaspro.nl>", 
          
          // Ontvanger
          to: ["timosteen22@gmail.com"], 
          
          subject: `${titel}: ${kenteken} - ${naam || 'Nieuw'}`,
          html: htmlContent,
          attachments: attachments
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        throw new Error(`Resend Error: ${errorData}`);
      }

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
