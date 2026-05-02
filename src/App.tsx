/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Banana, Sparkles, Download, Loader2, Camera, RotateCcw, Upload, X, Send, MessageSquare } from 'lucide-react';
import { generateNanoBananaArt, editNanoBananaArt, generateNanoBananaVideo, geminiChat } from './lib/gemini';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quota Tracking State
  const [imageQuoteCount, setImageQuoteCount] = useState<number>(0);
  const [videoQuoteCount, setVideoQuoteCount] = useState<number>(0);
  const IMAGE_LIMIT = 2;
  const VIDEO_LIMIT = 1;
  const DEV_MODE = true; // Set to false for real production launch

  // Initial load of quota from localStorage
  useEffect(() => {
    const savedImageCount = localStorage.getItem('nano_image_quota');
    const savedVideoCount = localStorage.getItem('nano_video_quota');
    if (savedImageCount) setImageQuoteCount(parseInt(savedImageCount));
    if (savedVideoCount) setVideoQuoteCount(parseInt(savedVideoCount));
  }, []);

    // Chat State
  const initialWelcomeMessage = `💬 INICIO
¿En qué puedo ayudarte hoy? 👇
Podés elegir una opción o escribir directamente tu consulta:

🚀 MENÚ DE SERVICIOS
1. Creación de contenido viral
2. Estrategia de marketing digital
3. Growth hacking
4. Psicología del consumidor
5. Branding e identidad de marca
6. Naming y posicionamiento
7. Diseño publicitario con IA
8. Diseño de piezas visuales para redes
9. Publicidad digital (Meta Ads / TikTok Ads)
10. Configuración de Meta Business
11. Embudos de venta (funnels)
12. Estrategias para e-commerce
13. Copywriting persuasivo
14. Guiones para videos virales
15. Calendario de contenido
16. Ideas creativas
17. Gestión de redes sociales
18. Community manager
19. Optimización de perfil
20. Creación de contenido con IA
21. Automatización de marketing
22. Integración de herramientas
23. Análisis de métricas
24. Optimización de contenido
25. Auditoría de redes sociales
26. Configuración de WhatsApp Business
27. Estrategias de venta por chat
28. Tendencias virales actuales
29. Estrategias para crecer desde cero
30. Monetización y marca personal
31. Asesoría creativa general`;

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: initialWelcomeMessage }
  ]);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatMessages.length > 1) {
      scrollToBottom();
    }
  }, [chatMessages]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSourceImage = () => {
    setSourceImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    if (!DEV_MODE && imageQuoteCount >= IMAGE_LIMIT) {
      setError(`Has alcanzado tu límite gratuito de ${IMAGE_LIMIT} imágenes. Contactá a NOVA Agency para un plan ilimitado.`);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setResultImage(null);

    try {
      let url;
      if (sourceImage) {
        url = await editNanoBananaArt(prompt, sourceImage);
      } else {
        url = await generateNanoBananaArt(prompt);
      }
      
      setResultImage(url);
      const newCount = imageQuoteCount + 1;
      setImageQuoteCount(newCount);
      localStorage.setItem('nano_image_quota', newCount.toString());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con la API de Imagen.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;
    
    if (!DEV_MODE && videoQuoteCount >= VIDEO_LIMIT) {
      setError(`Has alcanzado tu límite gratuito de ${VIDEO_LIMIT} video. Contactá a NOVA Agency para un plan ilimitado.`);
      return;
    }
    
    setIsGeneratingVideo(true);
    setError(null);
    setResultVideo(null);

    try {
      const url = await generateNanoBananaVideo(prompt);
      setResultVideo(url);
      const newCount = videoQuoteCount + 1;
      setVideoQuoteCount(newCount);
      localStorage.setItem('nano_video_quota', newCount.toString());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con la API de Video.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleChatSend = async () => {
    if (!currentChatInput.trim() || isChatLoading) return;

    const userMessage = currentChatInput.trim();
    setCurrentChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      // In App.tsx, the history needs to be in the format expected by geminiChat
      const historyForGemini = chatMessages.map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }]
      }));
      
      const response = await geminiChat(userMessage, historyForGemini);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error('Chat Error:', err);
      setChatMessages(prev => [...prev, { role: 'model', text: `⚠️ Error: ${err.message}` }]);
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#FFE135] selection:text-black">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FFE135] opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#E6C200] opacity-5 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-16 text-center lg:text-left flex flex-col lg:flex-row items-center gap-6 justify-between border-b border-white/10 pb-12">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center lg:justify-start gap-3 mb-4"
            >
              <div className="bg-[#ffe335] border-2 border-[#b57bee] p-2 rounded-xl">
                <Banana className="text-black w-8 h-8" />
              </div>
              <span className="text-[#b57bee] text-[17px] italic text-left leading-[25px] font-mono font-bold tracking-[0.2em] uppercase opacity-80">
                Creatividad en su máxima expresión.
              </span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-normal text-center text-[#77ffef] text-[41px] leading-[69px] no-underline uppercase"
              style={{ fontFamily: 'system-ui' }}
            >
              CREA, REDISEÑA, Y GENERA CONTENIDO<br />SIN LIMITES.
            </motion.h1>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center w-36 h-36 lg:w-48 lg:h-48 border border-[#b57bee] shadow-[0_0_25px_rgba(181,123,238,0.6),inset_0_0_15px_rgba(181,123,238,0.4)] rounded-full p-4 relative"
          >
            <div className="absolute inset-0 animate-spin-slow pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#b57bee] shadow-[0_0_15px_3px_rgba(181,123,238,1)] rounded-full" />
            </div>
            
            <div className="absolute inset-4 rounded-full border border-dashed border-[#b57bee] shadow-[0_0_15px_rgba(181,123,238,0.4)] pointer-events-none" />

            <a 
              href="https://cdesignia.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 whitespace-nowrap w-full h-full flex items-center justify-center text-center text-[15px] font-black uppercase tracking-widest hover:scale-110 transition-all cursor-pointer"
              style={{ color: '#f0e6ff', textShadow: '0 0 8px #b57bee, 0 0 15px #b57bee, 0 0 30px #b57bee' }}
            >
              C DESIGN IA
            </a>
          </motion.div>
        </header>

        {/* Input Section */}
        <section className="mb-20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe tu visión (ej. 'Una ciudad futurista en las nubes', 'Un mono cibernético')..."
                className="w-full bg-[#111] border-2 border-[#b57bee]/50 rounded-2xl p-6 text-xl placeholder:opacity-30 focus:border-[#b57bee] focus:outline-none transition-all resize-none min-h-[160px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[200px]">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              
              {!sourceImage ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-h-[60px] border-2 border-dashed border-[#b57bee]/50 hover:border-[#b57bee] hover:text-[#b57bee] text-white/60 font-bold flex items-center justify-center gap-2 rounded-2xl transition-all uppercase tracking-widest text-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Use Reference</span>
                </button>
              ) : (
                <div className="relative group flex-1 min-h-[60px]">
                  <img src={sourceImage} className="w-full h-full object-cover rounded-2xl border-2 border-[#FFE135]" />
                  <button 
                    onClick={clearSourceImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] bg-black/60 px-2 py-1 rounded-lg"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || isGeneratingVideo || !prompt || (!DEV_MODE && imageQuoteCount >= IMAGE_LIMIT)}
                className="flex-1 min-h-[60px] bg-[#FFE135] border-2 border-[#b57bee] text-black font-bold flex items-center justify-center gap-2 rounded-2xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-widest text-sm relative overflow-hidden"
              >
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-center">
                  <span>{sourceImage ? 'Modify Image' : 'Generate Art'}</span>
                  <span className="text-[9px] opacity-60">
                    {imageQuoteCount >= IMAGE_LIMIT && !DEV_MODE ? 'CUOTA AGOTADA' : `RESTAN: ${IMAGE_LIMIT - imageQuoteCount}`}
                  </span>
                </div>
              </button>

              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating || isGeneratingVideo || !prompt || (!DEV_MODE && videoQuoteCount >= VIDEO_LIMIT)}
                className="flex-1 min-h-[60px] border-2 border-[#b57bee] text-[#b57bee] font-bold flex items-center justify-center gap-2 rounded-2xl hover:bg-[#b57bee]/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(181,123,238,0.2)]"
              >
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-[#FFE135]" />
                <div className="flex flex-col items-center">
                  <span>Generate Video</span>
                  <span className="text-[9px] opacity-60">
                    {videoQuoteCount >= VIDEO_LIMIT && !DEV_MODE ? 'CUOTA AGOTADA' : `RESTAN: ${VIDEO_LIMIT - videoQuoteCount}`}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Quota Exhausted CTA */}
        {!DEV_MODE && (imageQuoteCount >= IMAGE_LIMIT || videoQuoteCount >= VIDEO_LIMIT) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12 p-8 bg-[#b57bee]/10 border-2 border-[#b57bee] rounded-[40px] text-center shadow-[0_0_50px_-10px_rgba(181,123,238,0.3)]"
          >
            <h2 className="text-3xl font-black italic mb-4 text-[#FFE135] tracking-tighter uppercase">
              ¡Ya probaste el poder de NOVA! 🚀
            </h2>
            <p className="text-base opacity-80 mb-8 max-w-lg mx-auto">
              Tu talento creativo merece más. Desbloqueá acceso ilimitado para seguir creando contenido profesional con NOVA Agency.
            </p>
            <a 
              href="https://wa.me/5491155018698"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#FFE135] text-black px-10 py-5 rounded-full font-black uppercase tracking-widest hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,225,53,0.4)]"
            >
              <Send className="w-5 h-5" />
              Solicitar acceso ilimitado
            </a>
          </motion.div>
        )}

        {/* Loading State - Image or Video */}
        <AnimatePresence>
          {(isGenerating || isGeneratingVideo) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 py-20 border-2 border-dashed border-[#b57bee]/30 rounded-3xl mb-12"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-[#FFE135] animate-spin" />
                <Banana className="absolute inset-0 m-auto w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold italic mb-2 tracking-tighter">
                  {isGeneratingVideo ? 'COOKING NANO VIDEO...' : 'EXTRACTING NANO POTENCY...'}
                </p>
                <p className="text-xs font-mono uppercase opacity-50 tracking-[0.3em]">
                  {isGeneratingVideo ? 'Synthesizing motion frames' : 'Painting with radioactive fruit'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 flex items-center gap-4 mb-8"
          >
            <div className="p-2 bg-red-500 rounded-lg">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold uppercase text-xs tracking-widest mb-1">Synthesis Failure</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        <div className="flex flex-col items-center gap-12">
          {/* Image Result */}
          {resultImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative max-w-2xl w-full"
            >
              <div className="absolute inset-0 bg-[#FFE135] blur-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden aspect-square">
                <img 
                  src={resultImage} 
                  alt="Generated art" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                  <a 
                    href={resultImage} 
                    download="nanobanana_art.png"
                    className="flex items-center gap-2 bg-[#FFE135] text-black self-start px-6 py-3 rounded-xl font-bold text-sm tracking-tight hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Download className="w-4 h-4" />
                    GET ART
                  </a>
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center px-4">
                <span className="text-[10px] font-mono uppercase opacity-40">Nano-Image_v2.5</span>
                <span className="text-[10px] font-mono uppercase opacity-40">512x512 PNG</span>
              </div>
            </motion.div>
          )}

          {/* Video Result */}
          {resultVideo && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative max-w-2xl w-full"
            >
              <div className="absolute inset-0 bg-[#b57bee] blur-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-[#111] border border-[#b57bee]/50 rounded-3xl overflow-hidden aspect-video shadow-[0_0_40px_-10px_rgba(181,123,238,0.3)]">
                <video 
                  src={resultVideo} 
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                />
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <span className="text-[10px] font-mono text-[#FFE135] uppercase tracking-widest">Nano-Motion_v1.0</span>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={resultVideo} 
                    download="nanobanana_video.mp4"
                    className="flex items-center gap-2 bg-[#FFE135] text-black px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Download className="w-3 h-3" />
                    SAVE VIDEO
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* Gemini Chat Section */}
          <section className="w-full max-w-2xl bg-[#111] border border-[#b57bee] rounded-3xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-[#b57bee]/50 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="bg-[#FFE135] border-2 border-[#b57bee] p-2 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">NOVA Agency</h3>
                  <p className="text-[10px] font-mono opacity-40">Powered by Gemini 2.5 Flash</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono opacity-40 uppercase">A-OK</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-12">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-sm font-medium">Initiate nano-cognition sequence.<br />Ask Gemini anything.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-[#FFE135] border border-[#b57bee] text-black font-medium' 
                      : 'bg-white/5 border border-[#b57bee]/50 text-white/90 leading-relaxed shadow-lg shadow-black/20'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-[#b57bee]/50 p-4 rounded-2xl flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FFE135]" />
                    <span className="text-[10px] font-mono uppercase opacity-50 tracking-widest">Processing...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-black/40 border-t border-[#b57bee]/50">
              <div className="flex gap-2">
                <input
                  value={currentChatInput}
                  onChange={(e) => setCurrentChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder="Escribe un mensaje o elige una opción..."
                  className="flex-1 bg-white/5 border border-[#b57bee]/50 rounded-xl px-4 py-3 text-sm focus:border-[#b57bee] focus:outline-none transition-all placeholder:opacity-30"
                />
                <button
                  onClick={handleChatSend}
                  disabled={isChatLoading || !currentChatInput.trim()}
                  className="bg-[#FFE135] border-2 border-[#b57bee] text-black p-3 rounded-xl disabled:opacity-50 hover:bg-white transition-all active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>

          <motion.a
            href="https://aitestkitchen.withgoogle.com/tools/music-fx"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-[#FFE135] border-2 border-[#b57bee] text-black px-8 py-4 rounded-full font-black text-sm uppercase tracking-tighter hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(181,123,238,0.5)] mt-4 mb-8"
          >
            <Sparkles className="w-4 h-4" />
            GENERATED MUSIC!
          </motion.a>
        </div>
      </main>

      <footer className="relative z-10 pt-8 pb-0 text-center">
        <div className="flex items-center justify-center gap-6 mb-4 h-[14px]">
          <div className="w-8 h-[1px] bg-[#FFE135] opacity-50" />
          <Banana className="w-4 h-4 text-[#FFE135]" />
          <div className="w-8 h-[1px] bg-[#FFE135] opacity-50" />
        </div>
        <p className="text-[10px] font-mono uppercase tracking-[0.5em] h-[38px] m-0 pr-0 text-[#b57bee]">
          DESARROLLADO POR C DESIGN IA 2025 BY AI STUDIO GOOGLE.
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}} />
    </div>
  );
}
