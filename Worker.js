import { Buffer } from 'node:buffer';

export default {
  async fetch(request, env) {
    // 1. CORS Headers - DEZE ZIJN CRUCIAAL
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. OPTIONS (Preflight) requests direct afhandelen
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      // Check of API key aanwezig is in de cloud omgeving
      if (!env.RESEND_API_KEY) {
        throw new Error("Server Error: RESEND_API_KEY ontbreekt in settings");
      }

      const formData = await request.formData();
      const typeWerk = formData.get("Type_Werk");
      
      let emailTo = ["info@autoglaspro.nl"]; 
      let emailFrom = "Autoglas Pro <info@autoglaspro.nl>";
      let emailSubject = "";
      let emailHtml = "";

      // --- LOGICA VOOR DE EMAIL INHOUD ---
      if (typeWerk === "Reparatie" || typeWerk === "Vervanging" || typeWerk === "Ruit Reparatie" || typeWerk === "Ruit Vervanging") {
        const kenteken = formData.get("Kenteken") || "Onbekend";
        const klantType = formData.get("Klant_Type") || "B2B";
        const datum = formData.get("Datum") || new Date().toLocaleDateString('nl-NL');
        const sterren = formData.get("Aantal_Sterren") || "";
        const opmerkingen = formData.get("Opmerkingen") || "-";
        const getCheck = (key) => formData.get(key) === "Ja" ? "✅ Ja" : "❌ Nee";
        
        emailSubject = `WERKBON: ${kenteken} - ${typeWerk}`;
        
        emailHtml = `
          <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #333; padding: 20px; text-align: center; color: white;">
                <h1 style="margin:0; font-size: 24px;">Werkbon Afgerond</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8; font-weight:bold; color: #FFD700;">${kenteken}</p>
              </div>
              <div style="padding: 20px;">
                <p><strong>Datum:</strong> ${datum}</p>
                <p><strong>Type:</strong> ${typeWerk} ${sterren ? `(${sterren}*)` : ''}</p>
                <p><strong>Klant:</strong> ${klantType}</p>
                <hr>
                <h3>Onderdelen</h3>
                <p>Regen Sensor: ${getCheck("Regen_Sensor")}</p>
                <p>Clips: ${getCheck("Clips")}</p>
                <p>Bovenlijst: ${getCheck("Boven_Lijst")}</p>
                <p>Driekwart Lijst: ${getCheck("Driekwart_Lijst")}</p>
                <p>Statische Calibratie: ${getCheck("Statische_Calibratie")}</p>
                <p>Dynamische Calibratie: ${getCheck("Dynamische_Calibratie")}</p>
                <hr>
                <p><strong>Opmerking:</strong> ${opmerkingen}</p>
              </div>
            </div>
          </body></html>`;
      } 
      // Voeg hier je andere 'Intake' logica toe indien nodig, of laat het zo als je alleen werkbonnen doet.
      else {
          // Fallback voor Intake of Vrije Email (simpel gehouden voor nu)
          emailSubject = `Nieuwe inzending: ${typeWerk}`;
          emailHtml = `<p>Er is een formulier ingevuld van type: ${typeWerk}</p>`;
      }

      // --- BIJLAGEN VERWERKEN ---
      const attachments = [];
      const files = formData.getAll("attachment");
      const today = new Date().toISOString().slice(0, 10); 

      // Beveiliging: Stop als data bizar groot is (> 15MB)
      let totalSize = 0;
      for (const file of files) {
        if (file instanceof File) {
          totalSize += file.size;
          if (totalSize > 15 * 1024 * 1024) throw new Error("De foto's zijn te groot (Max 15MB totaal). Probeer minder foto's.");

          const arrayBuffer = await file.arrayBuffer();
          const contentBuffer = Buffer.from(arrayBuffer);
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          
          attachments.push({
            filename: `${today}_${safeName}`,
            content: contentBuffer,
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
        const errorText = await resendResponse.text();
        console.error("Resend Fout:", errorText);
        throw new Error("Fout bij versturen email: " + errorText);
      }

      // SUCCES RESPONSE
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("Worker Error:", error);
      // ERROR RESPONSE (Altijd JSON + CORS headers!)
      return new Response(JSON.stringify({ 
        success: false, 
        message: error.message || "Onbekende server fout" 
      }), {
        status: 500, // Of 200 als je wilt dat de frontend het netjes afhandelt zonder try/catch
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
