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
      
      // Data ophalen
      const kenteken = formData.get("Kenteken") || "Onbekend";
      const klantType = formData.get("Klant_Type") || "-";
      const typeWerk = formData.get("Type_Werk") || "-";
      const opmerkingen = formData.get("Opmerkingen") || "Geen opmerkingen";
      const sterren = formData.get("Aantal_Sterren"); // <--- HIER HALEN WE NU DE STERREN OP

      // --- EMAIL DESIGN (HTML) ---
      let checklistHtml = "";
      
      // Loop door alle "Ja" vinkjes voor de checklist
      for (const [key, value] of formData.entries()) {
        if (value === "Ja") {
          // Maak underscores mooi (Regen_Sensor -> Regen Sensor)
          const cleanKey = key.replace(/_/g, ' ');
          checklistHtml += `
            <li style="margin-bottom: 5px;">
              <span style="color: #27ae60; font-weight: bold;">✓</span> ${cleanKey}
            </li>`;
        }
      }

      // De volledige HTML email template
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { background-color: #005CAB; color: #ffffff; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
          .badge { background-color: #E30613; color: white; padding: 5px 10px; border-radius: 4px; font-size: 14px; font-weight: bold; vertical-align: middle; }
          .content { padding: 30px; color: #333333; line-height: 1.6; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-block { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #005CAB; margin-bottom: 10px; }
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
            <h1>Werkbon</h1>
            <div style="margin-top: 10px; opacity: 0.9;">${kenteken}</div>
          </div>

          <div class="content">
            <div class="info-block">
              <span class="label">Opdrachtgever</span>
              <div class="value">${klantType}</div>
            </div>

            <div class="info-block">
              <span class="label">Type Werkzaamheid</span>
              <div class="value">
                ${typeWerk}
                ${sterren ? `<span class="badge" style="margin-left: 10px;">${sterren} Ster(ren)</span>` : ''}
              </div>
            </div>

            <div class="section-title">Uitgevoerde Controles & Onderdelen</div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${checklistHtml || '<li style="color: #999;">Geen items aangevinkt</li>'}
            </ul>

            <div class="section-title">Opmerkingen</div>
            <div class="remarks">
              "${opmerkingen}"
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              <em>Zie bijlagen voor de gemaakte foto's.</em>
            </p>
          </div>

          <div class="footer">
            Verzonden via Autoglas Pro App<br><br>
            Powered by <a href="https://spectux.com">Spectux.com</a>
          </div>
        </div>
      </body>
      </html>
      `;

      // Attachments verwerken
      const attachments = [];
      const files = formData.getAll("attachment");

      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          attachments.push({
            filename: file.name,
            content: buffer,
          });
        }
      }

      // 2. Verstuur naar Resend API
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Werkbon mail", 
          to: ["timosteen22@gmail.com"], 
          subject: `Werkbon: ${kenteken} - ${typeWerk}`,
          html: htmlContent,
          attachments: attachments
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        throw new Error(`Resend Error: ${errorData}`);
      }

      return new Response(JSON.stringify({ success: true, message: "Verzonden!" }), {
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
