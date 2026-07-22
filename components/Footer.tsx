import React, { useEffect, useState } from 'react';
import { FacebookIcon } from './ui/BrandIcons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PhoneCall, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

export const Footer = () => {
  const [settings, setSettings] = useState<any>({ facebookUrl: '', tiktokUrl: '', footerLogo: '', footerPaymentLogos: [] });
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [waReason, setWaReason] = useState('Order Issue');
  const [customReason, setCustomReason] = useState('');
  const { t } = useLanguage();

  const waNumber = "17247648185"; // without + for link

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payments')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          facebookUrl: data.facebookUrl || '',
          tiktokUrl: data.tiktokUrl || '',
          footerLogo: data.footerLogo || '',
          footerPaymentLogos: data.footerPaymentLogos || []
        });
      }
    });
  }, []);

  const handleWhatsAppSend = () => {
    const finalReason = waReason === 'Other' ? customReason : waReason;
    const message = encodeURIComponent(`Hi, I need help regarding: ${finalReason}`);
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
    setIsWhatsAppOpen(false);
    setIsContactOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>{`
        :root {
          --wave-color-1: rgba(239, 128, 32, 0.02);
          --wave-color-2: rgba(239, 128, 32, 0.04);
          --wave-color-3: rgba(239, 128, 32, 0.07);
          --wave-color-4: #fffdfc;
        }
        .dark {
          --wave-color-1: rgba(239, 128, 32, 0.01);
          --wave-color-2: rgba(239, 128, 32, 0.02);
          --wave-color-3: rgba(239, 128, 32, 0.04);
          --wave-color-4: #1e1e1e;
        }

        .mainF {
          padding-top: 0px;
          padding-bottom: 24px;
          margin-top: 40px;
          margin-left: 8px;
          margin-right: 8px;
          margin-bottom: 84px;
          border-radius: 20px;
          box-shadow: 0 4px 25px rgba(0,0,0,.04);
          background: #fffdfc;
          font-size: 97%;
          line-height: 1.8em;
          color: #08102b;
          border: 1px solid #e6e6e6;
          overflow: hidden;
        }
        .dark .mainF {
          background: #1e1e1e;
          color: #fffdfc;
          border-color: #444444;
        }
        @media (min-width: 768px) {
          .mainF {
            margin-bottom: 16px;
            padding-bottom: 24px;
          }
        }

        .footer-waves-container {
          position: relative;
          width: 100%;
          height: 50px;
          min-height: 40px;
          max-height: 60px;
          overflow: hidden;
          margin-bottom: 15px;
        }
        .waves {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .parallax > use {
          animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .parallax > use:nth-child(1) {
          animation-delay: -2s;
          animation-duration: 7s;
          fill: var(--wave-color-1);
        }
        .parallax > use:nth-child(2) {
          animation-delay: -3s;
          animation-duration: 10s;
          fill: var(--wave-color-2);
        }
        .parallax > use:nth-child(3) {
          animation-delay: -4s;
          animation-duration: 13s;
          fill: var(--wave-color-3);
        }
        .parallax > use:nth-child(4) {
          animation-delay: -5s;
          animation-duration: 20s;
          fill: var(--wave-color-4);
        }
        @keyframes move-forever {
          0% {
            transform: translate3d(-90px,0,0);
          }
          100% { 
            transform: translate3d(85px,0,0);
          }
        }

        .fotM {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 15px;
        }
        .secIn { margin: 0 auto; padding-left: 20px; padding-right: 20px; max-width: 1280px; width: 100%; }

        .abtU { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .abtT { display: flex; align-items: center; gap: 8px; justify-content: center; }
        .abtL { position: relative; width: 32px; height: 32px; background: rgba(0,0,0,.05); border-radius: 6px; overflow: hidden; }
        .dark .abtL { background: rgba(255,255,255,.05); }
        .abtI { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .abtT h2 { color: inherit; font-size: 1.1rem; margin: 0; font-weight: 800; }
        .abtD { font-size: 11px; opacity: 0.6; max-width: 480px; margin: 4px 0 0; line-height: 1.4; }

        .fotS { display: flex; align-items: center; justify-content: center; gap: 10px; list-style: none; padding: 0; margin: 5px 0; }
        .fotS li > * { color: inherit; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(0,0,0,.03); border: 1px solid rgba(0,0,0,.06); border-radius: 8px; transition: all 0.2s; text-decoration: none; }
        .dark .fotS li > * { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.06); }
        .fotS li > a:hover { transform: translateY(-2px); border-color: #EF8020; color: #EF8020; }

        .footer-links-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 8px 14px;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.85;
          margin: 10px 0;
          max-width: 800px;
        }
        .footer-links-row a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-links-row a:hover {
          color: #EF8020;
          text-decoration: underline;
        }
        .footer-links-row .dot {
          opacity: 0.4;
          font-size: 9px;
          user-select: none;
        }

        .fotB { width: 100%; border-top: 1px solid rgba(0,0,0,.05); dark:border-top-color: rgba(255,255,255,.05); padding-top: 15px; margin-top: 10px; }
        .fotC { display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 11px; opacity: 0.7; }
        .toTopB { width: 32px; height: 32px; cursor: pointer; display: flex; border-radius: 50%; transition: transform 0.2s; }
        .toTopB:hover { transform: translateY(-2px); }
        .toTopB svg { width: 32px; height: 32px; }
        .toTopB circle.b { fill: rgba(0,0,0,.02); stroke: rgba(0,0,0,.08); stroke-width: 2.2; }
        .dark .toTopB circle.b { fill: rgba(255,255,255,.02); stroke: rgba(255,255,255,.08); }
        .toTopB path { stroke: currentColor; stroke-width: 1.5; fill: none; }
      `}</style>
      <footer className="mainF">
        {/* Animated Wave Header */}
        <div className="footer-waves-container">
          <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
            <defs>
              <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
            </defs>
            <g className="parallax">
              <use xlinkHref="#gentle-wave" x="48" y="0" />
              <use xlinkHref="#gentle-wave" x="48" y="3" />
              <use xlinkHref="#gentle-wave" x="48" y="5" />
              <use xlinkHref="#gentle-wave" x="48" y="7" />
            </g>
          </svg>
        </div>

        <div className="fotM secIn">
          <div className="abtU">
            <div className="abtT">
              <div className="abtL">
                <img src={settings.footerLogo || "/favicon.png"} alt="DEEP SHOP" className="abtI" />
              </div>
              <h2>DEEP SHOP</h2>
            </div>
            <p className="abtD">border cross devices, border cross products, illegal products buy sell site</p>
          </div>

          <ul className="fotS">
            {settings.facebookUrl && (
              <li>
                <a aria-label="Facebook" href={settings.facebookUrl} target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 64 64" className="w-4.5 h-4.5 fill-current"><path d="M20.1,36h3.4c0.3,0,0.6,0.3,0.6,0.6V58c0,1.1,0.9,2,2,2h7.8c1.1,0,2-0.9,2-2V36.6c0-0.3,0.3-0.6,0.6-0.6h5.6 c1,0,1.9-0.7,2-1.7l1.3-7.8c0.2-1.2-0.8-2.4-2-2.4h-6.6c-0.5,0-0.9-0.4-0.9-0.9v-5c0-1.3,0.7-2,2-2h5.9c1.1,0,2-0.9,2-2V6.2 c0-1.1-0.9-2-2-2h-7.1c-13,0-12.7,10.5-12.7,12v7.3c0,0.3-0.3,0.6-0.6,0.6h-3.4c-1.1,0-2,0.9-2,2v7.8C18.1,35.1,19,36,20.1,36z"/></svg>
                </a>
              </li>
            )}
            {settings.tiktokUrl && (
              <li>
                <a aria-label="TikTok" href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 32 32" className="w-4.5 h-4.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                </a>
              </li>
            )}
            <li>
              <a aria-label="Whatsapp" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 64 64" className="w-4.5 h-4.5 fill-current"><path d="M6.9,48.4c-0.4,1.5-0.8,3.3-1.3,5.2c-0.7,2.9,1.9,5.6,4.8,4.8l5.1-1.3c1.7-0.4,3.5-0.2,5.1,0.5 c4.7,2.1,10,3,15.6,2.1c12.3-1.9,22-11.9,23.5-24.2C62,17.3,46.7,2,28.5,4.2C16.2,5.7,6.2,15.5,4.3,27.8c-0.8,5.6,0,10.9,2.1,15.6 C7.1,44.9,7.3,46.7,6.9,48.4z M21.3,19.8c0.6-0.5,1.4-0.9,1.8-0.9s2.3-0.2,2.9,1.2c0.6,1.4,2,4.7,2.1,5.1c0.2,0.3,0.3,0.7,0.1,1.2 c-0.2,0.5-0.3,0.7-0.7,1.1c-0.3,0.4-0.7,0.9-1,1.2c-0.3,0.3-0.7,0.7-0.3,1.4c0.4,0.7,1.8,2.9,3.8,4.7c2.6,2.3,4.9,3,5.5,3.4 c0.7,0.3,1.1,0.3,1.5-0.2c0.4-0.5,1.7-2,2.2-2.7c0.5-0.7,0.9-0.6,1.6-0.3c0.6,0.2,4,1.9,4.7,2.2c0.7,0.3,1.1,0.5,1.3,0.8 c0.2,0.3,0.2,1.7-0.4,3.2c-0.6,1.6-2.1,3.1-3.2,3.5c-1.3,0.5-2.8,0.7-9.3-1.9c-7-2.8-11.8-9.8-12.1-10.3c-0.3-0.5-2.8-3.7-2.8-7.1 C18.9,22.1,20.7,20.4,21.3,19.8z"/></svg>
              </a>
            </li>
          </ul>

          <div className="footer-links-row">
            <Link to="/">Home</Link>
            <span className="dot">•</span>
            <Link to="/all-products">All Products</Link>
            <span className="dot">•</span>
            <Link to="/faq">FAQs</Link>
            <span className="dot">•</span>
            <Link to="/help-center">Help Center</Link>
            <span className="dot">•</span>
            <Link to="/contact">Contact Us</Link>
            <span className="dot">•</span>
            <Link to="/my-tickets">Tickets</Link>
            <span className="dot">•</span>
            <Link to="/privacy">Privacy</Link>
            <span className="dot">•</span>
            <Link to="/terms">Terms</Link>
            <span className="dot">•</span>
            <Link to="/refund-policy">Refund</Link>
            <span className="dot">•</span>
            <Link to="/shipping-policy">Shipping</Link>
            <span className="dot">•</span>
            <Link to="/about">About</Link>
            <span className="dot">•</span>
            <button className="hover:underline" onClick={() => setIsContactOpen(true)}>Helpline</button>
          </div>

          <div className="fotB">
            <div className="fotC">
              <span className="credit">© {new Date().getFullYear()} DEEP SHOP. All rights reserved.</span>
              <div className="toTopB" onClick={scrollToTop}>
                <svg viewBox="0 0 34 34">
                  <g transform="translate(0, 34) rotate(-90)">
                    <circle className="b" cx="17" cy="17" r="15.92" />
                    <circle className="c" cx="17" cy="17" r="15.92" style={{ stroke: '#EF8020' }} />
                    <path transform="translate(34, 34) rotate(180)" d="M15.07,21.06,19.16,17l-4.09-4.06" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Options Popup */}
      {isContactOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsContactOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-sm rounded-[24px] p-6 shadow-2xl transform transition-all border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Contact Us</h3>
              <button onClick={() => setIsContactOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <a href="tel:+17247648185" className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-blue-600 dark:text-blue-400">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                  <PhoneCall className="w-5 h-5 text-[#1976d2] dark:text-[#8775f5]" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Direct Call</p>
                  <p className="text-xs opacity-80">+1 (724) 764-8185</p>
                </div>
              </a>

              <button onClick={() => setIsWhatsAppOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition text-emerald-600 dark:text-emerald-400">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="font-bold">WhatsApp</p>
                  <p className="text-xs opacity-80">Message us instantly</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Reason Popup */}
      {isWhatsAppOpen && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsWhatsAppOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-sm rounded-[24px] p-6 shadow-2xl transform transition-all border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">What do you need help with?</h3>
              <button onClick={() => setIsWhatsAppOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {['Order Issue', 'Product Inquiry', 'Delivery Status', 'Return/Refund', 'Other'].map(reason => (
                <label key={reason} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${waReason === reason ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                  <input type="radio" name="wareason" value={reason} checked={waReason === reason} onChange={(e) => setWaReason(e.target.value)} className="text-emerald-500 focus:ring-emerald-500" />
                  <span className={`text-sm font-medium ${waReason === reason ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{reason}</span>
                </label>
              ))}

              {waReason === 'Other' && (
                <textarea 
                  placeholder="Please specify your reason..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
                  rows={3}
                />
              )}

              <button 
                onClick={handleWhatsAppSend}
                disabled={waReason === 'Other' && !customReason.trim()}
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Continue to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

