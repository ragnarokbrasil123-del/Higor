/**
 * Carrega a logo do app (public/logo.png) como base64, para desenhar no
 * cabeçalho dos PDFs gerados no navegador (jsPDF precisa da imagem já
 * decodificada, não aceita só a URL).
 */
export async function carregarLogoBase64(): Promise<string | null> {
  try {
    const resp = await fetch('/logo.png');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    // sem logo, o PDF sai só com o texto — nunca trava a geração por isso
    return null;
  }
}
