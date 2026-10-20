// functions/api/send-to-48hr.js
//
// Fonction Cloudflare Pages (remplace netlify/functions/send-to-48hr.js).
// SÉCURITÉ : le jeton API 48HR reste côté serveur (variable d'environnement
// Cloudflare), jamais exposé dans le navigateur de la cliente.
//
// Sur Cloudflare Pages, le chemin du fichier détermine l'URL de la route :
// functions/api/send-to-48hr.js  →  https://votre-site.pages.dev/api/send-to-48hr
// (aucune configuration supplémentaire n'est nécessaire, contrairement à Netlify).

export async function onRequestPost(context) {
  const { request, env } = context;

  const token = env.ECOTRACK_API_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "ECOTRACK_API_TOKEN n'est pas configuré sur le serveur. Ajoutez-le dans Cloudflare Pages → Settings → Environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Corps de requête invalide." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    reference, nomClient, telephone, telephone2, adresse, codePostal, commune,
    codeWilaya, montant, remarque, produit, stock, quantite, produitARecuperer,
    boutique, type, stopDesk, weight, fragile, gpsLink,
  } = body || {};

  if (!nomClient || !telephone || !adresse || !commune || !codeWilaya || montant === undefined || montant === null) {
    return new Response(
      JSON.stringify({ error: "Champs obligatoires manquants (nom, téléphone, adresse, commune, wilaya, montant)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const payload = {
    reference,
    nom_client: nomClient,
    telephone,
    telephone_2: telephone2,
    adresse,
    code_postal: codePostal,
    commune,
    code_wilaya: Number(codeWilaya),
    montant: Number(montant),
    remarque,
    produit,
    stock: stock !== undefined ? Number(stock) : undefined,
    quantite,
    produit_a_recuperer: produitARecuperer,
    boutique,
    type: type ? Number(type) : 1,
    stop_desk: stopDesk !== undefined ? Number(stopDesk) : 0,
    weight,
    fragile: fragile !== undefined ? Number(fragile) : undefined,
    gps_link: gpsLink,
  };
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined || payload[k] === null || payload[k] === "") delete payload[k];
  });

  try {
    const res = await fetch("https://48hr.ecotrack.dz/api/v1/create/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || `Erreur 48HR (HTTP ${res.status}).`, details: data.errors || null }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Impossible de contacter le serveur de 48HR.", details: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Réponse pour toute autre méthode HTTP que POST (GET, PUT, etc.)
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }
  return onRequestPost(context);
}
