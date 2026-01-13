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
      const typeWerk = formData.get("Type_Werk"); 
      
      let emailSubject = "";
      let emailHtml = "";
      let emailTo = [];
      // Zolang je domein in Resend nog niet 'Verified' is, gebruik 'onboarding@resend.dev'.
      // Zodra het groen is: "Autoglas Pro <info@autoglaspro.nl>"
      let emailFrom = "Autoglas Pro <onboarding@resend.dev>"; 

      // --- SCENARIO A: JIJ STUURT EEN MAIL NAAR EEN KLANT (INTAKE) ---
      if (typeWerk === "Vrije_Email") {
        const klantEmail = formData.get("Email_To");
        const onderwerp = formData.get("Onderwerp");
        const bericht = formData.get("Bericht");
        
        emailTo = [klantEmail]; 
        emailSubject = onderwerp;

        // --- HET PREMIUM DESIGN ---
        // Vervang de URL bij 'img src' met de link naar jouw logo (liefst PNG)
        const logoUrl = "https://autoglaspro.nl/wp-content/uploads/2020/10/AutoglasPRO-logo-2.svg"; // Ik heb deze gok gedaan op basis van je site, check of hij werkt!

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
            
            <div style="max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
              
              <div style="background-color: #002D59; padding: 30px; text-align: center; border-bottom: 4px solid #E30613;">
                 <img src="${logoUrl}" alt="Autoglas Pro" width="200" style="display: block; margin: 0 auto; max-width: 100%; height: auto;">
                 <div style="font-size: 0; color: transparent; line-height: 0;">Autoglas Pro</div>
              </div>

              <div style="padding: 40px 30px; color: #333333; line-height: 1.8; font-size: 16px;">
                <div style="white-space: pre-wrap;">${bericht}</div>
              </div>

              <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #eeeeee; text-align: center;">
                 <p style="margin: 0; color: #666; font-size: 14px; font-style: italic;">Heeft u vragen? Reageer direct op deze e-mail.</p>
              </div>

              <div style="background-color: #1a1a1a; color: #888888; padding: 30px; font-size: 13px; line-height: 1.6; text-align: center;">
                <strong style="color: #ffffff; font-size: 15px; text-transform: uppercase; letter-spacing: 1px;">Autoglas Pro</strong><br><br>
                
                <span style="color: #cccccc;">Specialist in ruitreparatie en vervanging</span><br><br>
                
                <a href="tel:0612345678" style="color: #ffffff; text-decoration: none; font-weight: bold;">06-12345678</a><br>
                <a href="mailto:info@autoglaspro.nl" style="color: #E30613; text-decoration: none;">info@autoglaspro.nl</a><br>
                <a href="https://autoglaspro.nl" style="color: #E30613; text-decoration: none;">www.autoglaspro.nl</a>
                
                <div style="margin-top: 20px; border-top: 1px solid #333; padding-top: 20px; font-size: 11px; color: #555;">
                  &copy; ${new Date().getFullYear()} Autoglas Pro. Alle rechten voorbehouden.
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

      } 
      // --- SCENARIO B: SYSTEEM BERICHT (WERKBON / SCHADEMELDING) ---
      else {
        // (Dit gedeelte blijft hetzelfde als voorheen, voor jouw eigen administratie)
        const kenteken = formData.get("Kenteken") || "Onbekend";
        const naam = formData.get("Naam");
        const sterren = formData.get("Aantal_Sterren");
        const klantType = formData.get("Klant_Type");
        const opmerkingen = formData.get("Opmerkingen");
        
        const titel = naam ? "Online Schademelding" : "Werkbon";
        emailTo = ["info@autoglaspro.nl"]; 
        emailSubject = `${titel}: ${kenteken} - ${naam || 'Monteur'}`;

        let checklistHtml = "";
        for (const [key, value] of formData.entries()) {
          if (value === "Ja" && !["Kenteken", "Klant_Type", "Type_Werk", "Opmerkingen", "Aantal_Sterren", "Naam", "Email", "Telefoon", "Email_To", "Onderwerp", "Bericht"].includes(key)) {
            checklistHtml += `<li style="margin-bottom: 5px;"><span style="color: #27ae60; font-weight: bold;">✓</span> ${key.replace(/_/g, ' ')}</li>`;
          }
        }

        // Simpel design voor intern gebruik
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px;">
              <h1 style="color: #005CAB; text-align: center;">${titel}</h1>
              <h2 style="text-align: center; color: #333;">${kenteken}</h2>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p><strong>Klant:</strong> ${naam || '-'}</p>
              <p><strong>Type:</strong> ${typeWerk} ${sterren ? `(${sterren} Sterren)` : ''}</p>
              ${checklistHtml ? `<h3>Checklist</h3><ul>${checklistHtml}</ul>` : ''}
              <h3>Opmerkingen</h3>
              <p style="background: #fff8e1; padding: 15px;">"${opmerkingen}"</p>
            </div>
          </body>
          </html>
        `;
      }

      // --- BIJLAGEN ---
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
