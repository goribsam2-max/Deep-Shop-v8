import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

export const HeaderNotification: React.FC = () => {
  const location = useLocation();
  const [notifConfig, setNotifConfig] = useState<{
    enabled: boolean;
    text: string;
    linkEnabled: boolean;
    textLinkText?: string;
    textLinkUrl?: string;
    btnEnabled: boolean;
    buttonText?: string;
    buttonUrl?: string;
  }>({
    enabled: true,
    text: "Welcome to Lantro UI!",
    linkEnabled: true,
    textLinkText: "Test link",
    textLinkUrl: "#",
    btnEnabled: true,
    buttonText: "Buy now!",
    buttonUrl: ""
  });

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isLongText, setIsLongText] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "platform"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNotifConfig({
          enabled: data.notificationBannerEnabled ?? true,
          text: data.notificationBannerText ?? "Welcome to Lantro UI!",
          linkEnabled: data.notificationBannerLinkEnabled ?? true,
          textLinkText: data.notificationBannerLinkText ?? "Test link",
          textLinkUrl: data.notificationBannerLinkUrl ?? "#",
          btnEnabled: data.notificationBannerBtnEnabled ?? true,
          buttonText: data.notificationBannerBtnText ?? "Buy now!",
          buttonUrl: data.notificationBannerBtnUrl ?? ""
        });
      }
    }, (err) => {
      console.error("Error listening to notification settings:", err);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (notifConfig.text) {
      if (notifConfig.text.length > 35) {
        setIsLongText(true);
      } else if (textRef.current) {
        setIsLongText(textRef.current.scrollWidth > textRef.current.clientWidth);
      } else {
        setIsLongText(false);
      }
    }
  }, [notifConfig.text]);

  if (location.pathname !== '/' || dismissed || !notifConfig.enabled || !notifConfig.text) {
    return null;
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-6 my-1 animate-fade-in">
      <motion.div 
        layout
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`ntfC transition-all duration-300 ${expanded ? 'py-3 items-start md:items-center' : 'py-2.5 items-center'}`}
      >
        <div className={`ntfT ${expanded ? 'overflow-visible' : 'overflow-x-auto scrollbar-none'}`}>
          <motion.div 
            layout 
            className={`ntfA ${expanded ? '!flex-wrap !whitespace-normal justify-center items-center leading-relaxed gap-2' : 'flex-nowrap whitespace-nowrap'}`}
          >
            <span 
              ref={textRef}
              className={`inline-flex items-center gap-1.5 shrink-0 ${
                expanded 
                  ? '!whitespace-normal break-words text-center' 
                  : (isLongText ? 'max-w-[200px] sm:max-w-[380px] md:max-w-[550px] truncate whitespace-nowrap' : 'whitespace-nowrap')
              }`}
            >
              {notifConfig.text}
              {notifConfig.linkEnabled && notifConfig.textLinkText && (
                <a
                  className="ntf-inline-link whitespace-nowrap shrink-0"
                  href={notifConfig.textLinkUrl || "#"}
                  target={(notifConfig.textLinkUrl && notifConfig.textLinkUrl.startsWith("http")) ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                >
                  {notifConfig.textLinkText}
                </a>
              )}
            </span>

            {notifConfig.btnEnabled && notifConfig.buttonText && (
              <a
                className="ntf-btn whitespace-nowrap shrink-0"
                href={notifConfig.buttonUrl || "#"}
                target={(notifConfig.buttonUrl && notifConfig.buttonUrl.startsWith("http")) ? "_blank" : "_self"}
                rel="noopener noreferrer"
              >
                {notifConfig.buttonText}
              </a>
            )}

            {isLongText && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-all cursor-pointer shrink-0 active:scale-95"
                title={expanded ? "Show less" : "Show more"}
              >
                <span>{expanded ? "Less" : "More"}</span>
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </motion.div>
        </div>
        <div
          className="c-close shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Close notification"
          title="Close notification"
        />
      </motion.div>
    </div>
  );
};

export default HeaderNotification;

