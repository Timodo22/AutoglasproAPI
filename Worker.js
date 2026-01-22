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
      
      // EMAIL INSTELLING
      // Zodra je domein geverifieerd is in Resend dashboard:
      // Verander dit naar: "Autoglas Pro <info@autoglaspro.nl>"
      let emailFrom = "Autoglas Pro <info@autoglaspro.nl>"; 

      // --- SCENARIO A: JIJ STUURT EEN MAIL NAAR EEN KLANT (INTAKE) ---
      if (typeWerk === "Vrije_Email") {
        const klantEmail = formData.get("Email_To");
        const onderwerp = formData.get("Onderwerp");
        const bericht = formData.get("Bericht");
        
        emailTo = [klantEmail]; 
        emailSubject = onderwerp;

        const logoUrl = "https://autoglaspro.pages.dev/assets/AutoglasPRO-logo-2-fg5cX_i1.png";

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; font-family: sans-serif; background-color: #f1f5f9; }
              .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
              .header { background-color: #0f172a; padding: 30px; text-align: center; }
              .accent-bar { height: 6px; background-color: #dc2626; width: 100%; }
              .content { padding: 40px 30px; color: #334155; line-height: 1.6; font-size: 16px; }
              .footer { background-color: #0f172a; color: #94a3b8; padding: 40px 30px; text-align: center; font-size: 14px; }
              .footer-title { color: #ffffff; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; display: block; }
              .footer-link { color: #ffffff; text-decoration: none; font-weight: 600; }
              .footer-red { color: #dc2626; text-decoration: none; }
              .copyright { margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 20px; font-size: 12px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="container">
              
              <div class="header">
                 <img src="${logoUrl}" alt="Autoglas Pro" width="220" style="display: block; margin: 0 auto; max-width: 100%; height: auto;">
              </div>
              <div class="accent-bar"></div>

              <div class="content">
                <div style="white-space: pre-wrap;">${bericht}</div>
              </div>

              <div class="footer">
                
                <div style="margin-bottom: 25px;">
                   <span class="footer-title">Contactgegevens</span>
                   Oostwijk 1C<br>
                   5406 XT Uden
                </div>

                <div style="margin-bottom: 25px;">
                   <a href="tel:0413331619" class="footer-link">📞 0413 331 619</a><br><br>
                   <a href="mailto:info@autoglaspro.nl" class="footer-link">✉️ info@autoglaspro.nl</a>
                </div>

                <div style="margin-bottom: 25px;">
                   <a href="https://autoglaspro.nl" class="footer-red">www.autoglaspro.nl</a>
                </div>

                <div class="copyright">
                  &copy; ${new Date().getFullYear()} Autoglas Pro Uden. Alle rechten voorbehouden.
                </div>
              </div>

            </div>
          </body>
          </html>
        `;

      } 
      // --- SCENARIO B: SYSTEEM BERICHT (WERKBON / SCHADEMELDING) ---
      else {
        const kenteken = formData.get("Kenteken") || "Onbekend";
        const naam = formData.get("Naam");
        const sterren = formData.get("Aantal_Sterren");
        const klantType = formData.get("Klant_Type");
        const opmerkingen = formData.get("Opmerkingen");
        // HIER HALEN WE DE DATUM OP:
        const datumWerk = formData.get("Datum") || new Date().toLocaleDateString('nl-NL');
        
        const titel = naam ? "Online Schademelding" : "Werkbon";
        emailTo = ["info@autoglaspro.nl"]; 
        emailSubject = `${titel}: ${kenteken} - ${naam || 'Monteur'}`;

        let checklistHtml = "";
        for (const [key, value] of formData.entries()) {
          // Zorg dat 'Datum' niet in de checklist komt (want we tonen hem al apart)
          if (value === "Ja" && !["Kenteken", "Klant_Type", "Type_Werk", "Datum", "Opmerkingen", "Aantal_Sterren", "Naam", "Email", "Telefoon", "Email_To", "Onderwerp", "Bericht"].includes(key)) {
            checklistHtml += `<li style="margin-bottom: 5px;"><span style="color: #27ae60; font-weight: bold;">✓</span> ${key.replace(/_/g, ' ')}</li>`;
          }
        }

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px;">
              <h1 style="color: #005CAB; text-align: center;">${titel}</h1>
              <h2 style="text-align: center; color: #333;">${kenteken}</h2>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              
              <p><strong>Datum:</strong> ${datumWerk}</p>
              <p><strong>Klant:</strong> ${naam || '-'}</p>
              <p><strong>Type:</strong> ${typeWerk} ${sterren ? `(${sterren} Sterren)` : ''}</p>
              <p><strong>Opdrachtgever:</strong> ${klantType}</p>
              
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
      
      // Datum voor bestandsnaam (dit houden we technisch op 'vandaag' voor sortering)
      const today = new Date().toISOString().slice(0, 10); 

      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          
          // Maak een nette bestandsnaam met datum: 2024-01-20_bestandsnaam.jpg
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const fileNameWithDate = `${today}_${safeName}`;

          attachments.push({
            filename: fileNameWithDate,
            content: Buffer.from(arrayBuffer),
          });
        }
      }

      // --- VERSTUREN NAAR RESEND ---
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
