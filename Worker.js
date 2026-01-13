// Cloudflare Worker Code
export default {
  async fetch(request, env) {
    // 1. CORS Headers (Zodat je frontend mag praten met deze backend)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Of zet hier je specifieke domein voor meer veiligheid
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
      
      // Data uit het formulier halen
      const kenteken = formData.get("Kenteken");
      const klantType = formData.get("Klant_Type");
      const typeWerk = formData.get("Type_Werk");
      const opmerkingen = formData.get("Opmerkingen") || "Geen opmerkingen";
      
      // Bouw de email HTML
      let htmlContent = `
        <h1>Nieuwe Werkbon: ${kenteken}</h1>
        <p><strong>Klant Type:</strong> ${klantType}</p>
        <p><strong>Type Werk:</strong> ${typeWerk}</p>
        <p><strong>Opmerkingen:</strong><br>${opmerkingen}</p>
        <h3>Checklist:</h3>
        <ul>
      `;

      // Voeg alle "Ja" vinkjes toe aan de HTML
      for (const [key, value] of formData.entries()) {
        if (value === "Ja") {
          htmlContent += `<li>${key}</li>`;
        }
      }
      htmlContent += "</ul>";

      // Bestanden verwerken voor Resend (Attachments)
      const attachments = [];
      const files = formData.getAll("attachment");

      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          // Converteer naar Buffer (nodig voor email attachment encoding)
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
          from: "Werkbon App <onboarding@resend.dev>", // Of je eigen geverifieerde domein
          to: ["info@autoglaspro.nl"], // <-- JOUW EMAIL ADRES
          subject: `Werkbon: ${kenteken} (${typeWerk})`,
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
