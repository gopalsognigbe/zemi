-- Permettre au zem de créer/mettre à jour SA ligne drivers
-- (le trigger le fait déjà à l'inscription, mais les comptes incomplets
-- ou les resets peuvent laisser un profil sans ligne drivers).

create policy "drivers_insert_self"
  on public.drivers
  for insert
  with check (auth.uid() = user_id);
