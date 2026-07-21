import React, { useEffect, useState } from 'react';
import { FacebookIcon } from './ui/BrandIcons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QrCode, ShieldCheck, PhoneCall, MessageCircle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

export const Footer = () => {
  const [settings, setSettings] = useState<any>({ facebookUrl: '', tiktokUrl: '', footerPaymentLogos: [] });
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [waReason, setWaReason] = useState('Order Issue');
  const [customReason, setCustomReason] = useState('');
  const { t } = useLanguage();
  const navigate = useNavigate();

  const waNumber = "17247648185"; // without + for link

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payments')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          facebookUrl: data.facebookUrl || '',
          tiktokUrl: data.tiktokUrl || '',
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

  return (
    <>
      <div className="relative mx-[-1.25rem] md:mx-[-3rem] w-[calc(100%+2.5rem)] md:w-[calc(100%+6rem)] overflow-hidden pb-16 pt-12">
        
        {/* Floating Transition Wave Animation - XML Style & Flowing underneath/paka spaces */}
        <div className="absolute bottom-0 left-0 right-0 w-full z-0 h-[130px] pointer-events-none overflow-hidden flex flex-col justify-end">
          <svg className="waves w-full h-[100px] block" preserveAspectRatio="none" shapeRendering="auto" viewBox="0 24 150 28" style={{ marginBottom: '-1px' }}>
            <defs>
               <path d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" id="wave-bg" />
            </defs>
            <g className="plx">
              <use href="#wave-bg" x="48" y="0" />
              <use href="#wave-bg" x="48" y="3" />
              <use href="#wave-bg" x="48" y="5" />
              <use href="#wave-bg" x="48" y="7" />
            </g>
          </svg>
          <div className="wvH w-full block" style={{ height: '32px', marginTop: '-1.5px' }} />
        </div>

        {/* Floating rounded container layout with left, right, and bottom spacing (paka side & niche) */}
        <div className="relative z-10 px-4 sm:px-6 md:px-8 mb-6 sm:mb-8">
          <footer className="w-full max-w-7xl mx-auto bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md text-[var(--fotT)] border-[0.5px] border-zinc-200/35 dark:border-zinc-900/30 rounded-[32px] overflow-hidden shadow-xl p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
              
              {/* Main Footer Layout (Brand + 2 Exact Support Columns + Payment details) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-10 border-b border-zinc-200 dark:border-zinc-900">
                
                {/* Column 1: Brand Info with dynamic favicon logo on the left */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/favicon.png" 
                      className="w-10 h-10 rounded-2xl object-contain bg-white p-1 border border-zinc-200/85 dark:border-zinc-800 shadow-sm shrink-0" 
                      alt="DEEP SHOP" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                    />
                    <div className="abtT">
                      <h2 className="text-lg font-black text-zinc-950 dark:text-zinc-50 tracking-tight">DEEP SHOP</h2>
                      <p className="text-[10px] text-[var(--linkC)] dark:text-[var(--darkU)] font-black uppercase tracking-widest">Trusted Border Cross Site</p>
                    </div>
                  </div>
                  <p className="abtD text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                    Bangladesh's trusted platform for Border Cross Products & genuine mobiles. We offer authentic devices and premium customer support across the nation.
                  </p>
                  
                  {/* Social Media Link Widgets */}
                  <div className="flex items-center gap-2.5 pt-1">
                    {settings.facebookUrl && (
                      <a 
                        href={settings.facebookUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-blue-50 hover:text-[var(--linkC)] hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-[var(--darkU)] transition-all duration-300 shadow-sm"
                      >
                        <FacebookIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {settings.tiktokUrl && (
                      <a 
                        href={settings.tiktokUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="TikTok"
                        className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-white transition-all duration-300 shadow-sm"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* Column 2: Exact Customer Support Links */}
                <div className="lg:col-span-2.5 flex flex-col gap-3">
                  <h3 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-widest">{t('customer_support') || 'Customer Support'}</h3>
                  <ul className="flex flex-col gap-2.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <li><Link to="/faq" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('faqs') || 'FAQs & Help'}</Link></li>
                    <li><Link to="/help-center" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('help_center') || 'Help Center'}</Link></li>
                    <li><Link to="/my-tickets" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('my_tickets') || 'My Support Tickets'}</Link></li>
                    <li><Link to="/contact" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('contact_us') || 'Contact Us'}</Link></li>
                    <li><Link to="/about" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('about_us') || 'About Us'}</Link></li>
                  </ul>
                </div>

                {/* Column 3: Exact Policies & Terms Links */}
                <div className="lg:col-span-2.5 flex flex-col gap-3">
                  <h3 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-widest">{t('policies') || 'Policies'}</h3>
                  <ul className="flex flex-col gap-2.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <li><Link to="/privacy" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('privacy_policy') || 'Privacy Policy'}</Link></li>
                    <li><Link to="/terms" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('terms_conditions') || 'Terms of Service'}</Link></li>
                    <li><Link to="/refund-policy" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('refund_policy') || 'Refund Policy'}</Link></li>
                    <li><Link to="/shipping-policy" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('shipping_policy') || 'Shipping Policy'}</Link></li>
                    <li><Link to="/cookie-policy" className="hover:text-[var(--linkC)] dark:hover:text-[var(--darkU)] transition-colors duration-200">{t('cookie_policy') || 'Cookie Policy'}</Link></li>
                  </ul>
                </div>

                {/* Column 4: Payment Methods, Helpline Info & Merchant Seal */}
                <div className="lg:col-span-3 flex flex-col gap-5 lg:border-l lg:border-zinc-200 dark:lg:border-zinc-900 lg:pl-6">
                  
                  {/* Helpline Widget Card */}
                  <div 
                    className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-all duration-300 shadow-sm"
                    onClick={() => setIsContactOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[var(--linkC)] dark:text-[var(--darkU)]">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900 dark:text-white">{t('helpline')}: +1 (724) 764-8185</p>
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">10:00 AM - 10:00 PM</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Gateway Header & Accreditations */}
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-widest flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[var(--linkC)] dark:text-[var(--darkU)]" /> {t('accepted_payments') || 'Accepted Payments'}
                    </p>
                    
                    {/* Payment Icon Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {settings.footerPaymentLogos?.map((method: any, i: number) => (
                        <div 
                          key={i} 
                          className="px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex items-center gap-1.5 min-w-[75px] justify-center hover:scale-[1.02] transition-transform duration-200"
                        >
                          <img src={method.icon} alt={method.name} className="h-4 w-auto object-contain" />
                          <span className="text-[9px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{method.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Security and Verification Stamps */}
                    <div className="flex items-center gap-1.5 mt-1 opacity-90">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--linkC)] dark:text-[var(--darkU)]" />
                      <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Verified Merchant & Secure Processing</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Copyright Block */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center text-center gap-4">
                
                {/* Copyright info */}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>© {new Date().getFullYear()} DEEP SHOP. All rights reserved.</span>
                </p>

              </div>

            </div>
          </footer>
        </div>

      </div>

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
                  <PhoneCall className="w-5 h-5 text-[var(--linkC)] dark:text-[var(--darkU)]" />
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
