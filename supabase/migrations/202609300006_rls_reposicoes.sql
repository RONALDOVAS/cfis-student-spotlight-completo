ALTER TABLE public.reposicoes_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados podem visualizar reposicoes_agendadas"
ON public.reposicoes_agendadas FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Equipe autenticada pode gerenciar reposicoes_agendadas"
ON public.reposicoes_agendadas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('professor','coordenador','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('professor','coordenador','admin')
  )
);
