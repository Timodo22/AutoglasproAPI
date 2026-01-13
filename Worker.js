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
      
      // Kijk wat voor soort bericht dit is
      const typeWerk = formData.get("Type_Werk"); // "Vrije_Email", "Online Schademelding" of "Werkbon"
      
      let emailSubject = "";
      let emailHtml = "";
      let emailTo = [];
      let emailFrom = "Autoglas Pro <info@autoglaspro.nl>"; // Pas aan naar onboarding@resend.dev als domein nog niet groen is!

      // --- SCENARIO A: JIJ STUURT EEN MAIL NAAR EEN KLANT (INTAKE) ---
      if (typeWerk === "Vrije_Email") {
        const klantEmail = formData.get("Email_To");
        const onderwerp = formData.get("Onderwerp");
        const bericht = formData.get("Bericht"); // De tekst die jij typt
        
        emailTo = [klantEmail]; // We sturen het naar de klant
        emailSubject = onderwerp;

        // We stoppen jouw tekst in de mooie Autoglas Pro Layout
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              
              <div style="background-color: #005CAB; padding: 20px; text-align: center;">
                 <h1 style="color: #ffffff; margin: 0; font-size: 24px;">AUTOGLAS PRO</h1>
              </div>

              <div style="padding: 30px; color: #333; line-height: 1.6;">
                <p style="white-space: pre-wrap;">${bericht}</p>
              </div>

              <div style="background-color: #333; color: #888; padding: 20px; text-align: center; font-size: 12px;">
                <strong>Autoglas Pro</strong><br>
                Tel: 06-12345678<br>
                Email: info@autoglaspro.nl<br>
                <a href="https://autoglaspro.nl" style="color: #fff; text-decoration: none;">www.autoglaspro.nl</a>
              </div>
            </div>
          </body>
          </html>
        `;

      } 
      // --- SCENARIO B: SYSTEEM BERICHT (WERKBON / SCHADEMELDING) ---
      else {
        // Dit is de oude logica voor werkbonnen
        const kenteken = formData.get("Kenteken") || "Onbekend";
        const naam = formData.get("Naam");
        const sterren = formData.get("Aantal_Sterren");
        const klantType = formData.get("Klant_Type");
        const opmerkingen = formData.get("Opmerkingen");
        
        const titel = naam ? "Online Schademelding" : "Werkbon";
        emailTo = ["info@autoglaspro.nl"]; // Dit gaat naar JOU
        emailSubject = `${titel}: ${kenteken} - ${naam || 'Monteur'}`;

        // Checklist opbouwen
        let checklistHtml = "";
        for (const [key, value] of formData.entries()) {
          if (value === "Ja" && !["Kenteken", "Klant_Type", "Type_Werk", "Opmerkingen", "Aantal_Sterren", "Naam", "Email", "Telefoon", "Email_To", "Onderwerp", "Bericht"].includes(key)) {
            checklistHtml += `<li style="margin-bottom: 5px;"><span style="color: #27ae60; font-weight: bold;">✓</span> ${key.replace(/_/g, ' ')}</li>`;
          }
        }

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #005CAB; text-align: center;">${titel}</h1>
              <h2 style="text-align: center; color: #333;">${kenteken}</h2>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p><strong>Type:</strong> ${typeWerk} ${sterren ? `(${sterren} Sterren)` : ''}</p>
              ${checklistHtml ? `<h3>Checklist</h3><ul>${checklistHtml}</ul>` : ''}
              <h3>Opmerkingen</h3>
              <p style="background: #fff8e1; padding: 15px;">"${opmerkingen}"</p>
            </div>
          </body>
          </html>
        `;
      }

      // --- BIJLAGEN VERWERKEN ---
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

      // --- VERSTUREN ---
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: emailTo, 
          subject: emailSubject,
          html: emailHtml,
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
