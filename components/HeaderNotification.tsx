import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const HeaderNotification: React.FC = () => {
  const location = useLocation();
  const [notifConfig, setNotifConfig] = useState<{
    enabled: boolean;
    text: string;
    textLinkText?: string;
    textLinkUrl?: string;
    buttonText?: string;
    buttonUrl?: string;
  }>({
    enabled: true,
    text: "Welcome to Lantro UI!",
    textLinkText: "Test link",
    textLinkUrl: "#",
    buttonText: "Buy now!",
    buttonUrl: ""
  });

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "platform"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNotifConfig({
          enabled: data.notificationBannerEnabled ?? true,
          text: data.notificationBannerText ?? "Welcome to Lantro UI!",
          textLinkText: data.notificationBannerLinkText ?? "Test link",
          textLinkUrl: data.notificationBannerLinkUrl ?? "#",
          buttonText: data.notificationBannerBtnText ?? "Buy now!",
          buttonUrl: data.notificationBannerBtnUrl ?? ""
        });
      }
    }, (err) => {
      console.error("Error listening to notification settings:", err);
    });

    return () => unsub();
  }, []);

  if (location.pathname !== '/' || dismissed || !notifConfig.enabled || !notifConfig.text) {
    return null;
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-6 my-1 animate-fade-in">
      <div className="ntfC">
        <div className="ntfT">
          <div className="ntfA">
            <span className="whitespace-nowrap inline-flex items-center gap-1 shrink-0">
              {notifConfig.text}
              {notifConfig.textLinkText && (
                <a
                  className="ntf-inline-link whitespace-nowrap"
                  href={notifConfig.textLinkUrl || "#"}
                  target={(notifConfig.textLinkUrl && notifConfig.textLinkUrl.startsWith("http")) ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                >
                  {notifConfig.textLinkText}
                </a>
              )}
            </span>
            {notifConfig.buttonText && (
              <a
                className="ntf-btn whitespace-nowrap shrink-0"
                href={notifConfig.buttonUrl || "#"}
                target={(notifConfig.buttonUrl && notifConfig.buttonUrl.startsWith("http")) ? "_blank" : "_self"}
                rel="noopener noreferrer"
              >
                {notifConfig.buttonText}
              </a>
            )}
          </div>
        </div>
        <div
          className="c-close shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Close notification"
          title="Close notification"
        />
      </div>
    </div>
  );
};

export default HeaderNotification;
