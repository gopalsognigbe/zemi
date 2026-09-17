import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée. Utilisez POST.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: 'Variables d’environnement Supabase manquantes.' },
        500,
      );
    }

    // Client utilisateur : lit le JWT de la requête
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Non authentifié.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey ?? serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Non authentifié.' }, 401);
    }

    const body = (await req.json()) as { amount?: unknown };
    const amount = Number(body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse(
        { error: 'Le montant doit être un nombre supérieur à 0.' },
        400,
      );
    }

    // Service role : écriture du solde (contourne la RLS)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: wallet, error: walletError } = await admin
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError) {
      return jsonResponse(
        { error: `Lecture portefeuille : ${walletError.message}` },
        500,
      );
    }

    const currentBalance = wallet ? Number(wallet.balance) || 0 : 0;
    const newBalance = currentBalance + amount;

    if (!wallet) {
      const { error: insertWalletError } = await admin.from('wallets').insert({
        user_id: user.id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      });
      if (insertWalletError) {
        return jsonResponse(
          { error: `Création portefeuille : ${insertWalletError.message}` },
          500,
        );
      }
    } else {
      const { error: updateError } = await admin
        .from('wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        return jsonResponse(
          { error: `Mise à jour solde : ${updateError.message}` },
          500,
        );
      }
    }

    const { error: txError } = await admin.from('wallet_transactions').insert({
      user_id: user.id,
      amount,
      type: 'topup',
    });

    if (txError) {
      return jsonResponse(
        { error: `Transaction : ${txError.message}` },
        500,
      );
    }

    return jsonResponse({ balance: newBalance });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Erreur interne inattendue.';
    return jsonResponse({ error: message }, 500);
  }
});
