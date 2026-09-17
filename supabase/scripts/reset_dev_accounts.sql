-- Réinitialisation des comptes de test ZEMi (inscriptions + auth).
-- À exécuter dans Supabase : SQL Editor → New query → Run.
-- Conserve pricing_config et la structure des tables.

begin;

delete from public.ratings;
delete from public.wallet_transactions;
delete from public.withdrawal_requests;
delete from public.rides;
delete from public.deliveries;
delete from auth.users;

commit;
