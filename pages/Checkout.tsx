import { formatPrice, isForbiddenNumber } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { handleCoinDeductionWithExpiry } from "../lib/coinExpiry";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { OrderStatus } from "../types";
import { sendOrderToTelegram } from "../services/telegram";
import { getProductCoinReward } from "../lib/coinRewards";
import { CustomSectionEmbed } from "../components/CustomSectionEmbed";
import { useTheme } from "../components/ThemeContext";
import { useLanguage } from "../components/LanguageContext";
import VoiceMessageBubble from "../components/ui/voice-message-bubble";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Skeleton } from "../components/ui/skeleton";
import {
  CreditCard,
  Truck,
  Shield,
  MapPin,
  Lock,
  Check,
  ChevronLeft,
  Percent,
  X,
  Smartphone,
  ShoppingBag,
  Ticket,
  Copy,
  QrCode
} from "lucide-react";
import { cn } from "../lib/utils";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const region = localStorage.getItem("user_region") || "BD";
  const isForeign = region === "IN" || region === "PK";

  // Local storage helper
  const getSavedState = (key: string, defaultValue: any) => {
    try {
      const item = localStorage.getItem(`vibe_checkout_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [items, setItems] = useState<any[]>([]);
  const isCodDisabledBySellers = items.some((item: any) => item.isCodEnabled === false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(() => getSavedState("currentStep", 1));
  const [userIp, setUserIp] = useState<string>("");
  const [settings, setSettings] = useState<any>(null);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [resolvedAdvanceAmount, setResolvedAdvanceAmount] = useState<number | null>(null);
  const [sellerPaymentNumbers, setSellerPaymentNumbers] = useState<{bkash: string, nagad: string} | null>(null);

  // Address
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => getSavedState("selectedAddressId", null));
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(() => getSavedState("isAddingNewAddress", false));
  const [newAddress, setNewAddress] = useState(() => getSavedState("newAddress", {
    name: "",
    phone: "",
    altPhone: "",
    address: "",
  }));

  // Payment
  const prefMeth = localStorage.getItem("vibe_preferred_payment");
  const defaultBank =
    prefMeth === "bKash or Nagad" || prefMeth === "bKash" || prefMeth === "Nagad"
      ? "bangla_qr"
      : null;
  const defaultPaymentType =
    prefMeth === "Cash on Delivery" ? "cod" : prefMeth === "DP Coin" ? "vgcoin" : defaultBank ? "advance" : "cod";
  const [paymentType, setPaymentType] = useState<
    "cod" | "advance" | "vgcoin" | null
  >(() => getSavedState("paymentType", defaultPaymentType));
  const [advanceType, setAdvanceType] = useState<"full" | "delivery" | null>(() => getSavedState("advanceType", null));
  const [bankingMethod, setBankingMethod] = useState<"bangla_qr" | "bank" | null>(() => getSavedState("bankingMethod", defaultBank as any));
  const [bankingAccountName, setBankingAccountName] = useState(() => getSavedState("bankingAccountName", ""));
  const [bankingTrxId, setBankingTrxId] = useState(() => getSavedState("bankingTrxId", ""));

  // Promo & Gift
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [isGift, setIsGift] = useState(() => getSavedState("isGift", false));
  const [giftNote, setGiftNote] = useState(() => getSavedState("giftNote", ""));
  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [claimedCouponsList, setClaimedCouponsList] = useState<any[]>([]);

  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  useEffect(() => {
    if (isCodDisabledBySellers && paymentType === "cod") {
      setPaymentType("advance");
    }
  }, [isCodDisabledBySellers, paymentType]);

  useEffect(() => {
    localStorage.setItem("vibe_checkout_currentStep", JSON.stringify(currentStep));
    localStorage.setItem("vibe_checkout_selectedAddressId", JSON.stringify(selectedAddressId));
    localStorage.setItem("vibe_checkout_isAddingNewAddress", JSON.stringify(isAddingNewAddress));
    localStorage.setItem("vibe_checkout_newAddress", JSON.stringify(newAddress));
    localStorage.setItem("vibe_checkout_paymentType", JSON.stringify(paymentType));
    localStorage.setItem("vibe_checkout_advanceType", JSON.stringify(advanceType));
    localStorage.setItem("vibe_checkout_bankingMethod", JSON.stringify(bankingMethod));
    localStorage.setItem("vibe_checkout_bankingAccountName", JSON.stringify(bankingAccountName));
    localStorage.setItem("vibe_checkout_bankingTrxId", JSON.stringify(bankingTrxId));
    localStorage.setItem("vibe_checkout_isGift", JSON.stringify(isGift));
    localStorage.setItem("vibe_checkout_giftNote", JSON.stringify(giftNote));
  }, [currentStep, selectedAddressId, isAddingNewAddress, newAddress, paymentType, advanceType, bankingMethod, bankingAccountName, bankingTrxId, isGift, giftNote]);

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!auth.currentUser) return;
      const userSnap = await import("firebase/firestore").then((m) =>
        m.getDoc(m.doc(db, "users", auth.currentUser!.uid)),
      );
      if (userSnap.exists()) {
        const claimedIds = userSnap.data().claimedCoupons || [];
        if (claimedIds.length > 0) {
          const { collection, query, documentId, where, getDocs } =
            await import("firebase/firestore");
          const chunked = claimedIds.slice(0, 10);
          const q = query(
            collection(db, "coupons"),
            where(documentId(), "in", chunked),
          );
          const snap = await getDocs(q);
          setClaimedCouponsList(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        }
      }
    };
    fetchCoupons();
  }, []);

  useEffect(() => {
    const ref = localStorage.getItem("affiliateRef");
    if (ref) {
      setAffiliateRef(ref);
      setCouponCode(ref);
      setAppliedPromo({
        id: "affiliate",
        type: "percent",
        discount: 5,
        code: "REF-LINK",
      });
    }

    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => setUserIp(d.ip))
      .catch(() => setUserIp("Unavailable"));

    const unsubSettings = onSnapshot(doc(db, "settings", "platform"), (doc) => {
      if (doc.exists()) setSettings(doc.data());
    });
    
    const unsubPaymentSettings = onSnapshot(doc(db, "settings", "payment_gateway"), (doc) => {
      if (doc.exists()) setPaymentSettings(doc.data());
    });

    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentSettings((prev: any) => ({...prev, ...data}));
      }
    });

    const cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
    if (cart.length === 0) {
      navigate("/");
      return;
    }
    setItems(cart);

    if (isForeign) {
      setPaymentType("advance");
      setAdvanceType("full");
      setBankingMethod("bank");
    }

    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        getDoc(doc(db, "users", u.uid)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserCoins(data.coins || 0);
            if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
              setSavedAddresses(data.addresses);
              setSelectedAddressId(data.addresses[0].id);
            } else if (data.address) {
              const singleAddr = {
                id: "addr_1",
                name: data.displayName || "User",
                phone: data.phoneNumber || "",
                address: data.address,
                isDefault: true
              };
              setSavedAddresses([singleAddr]);
              setSelectedAddressId(singleAddr.id);
            } else {
              setIsAddingNewAddress(true);
            }
          } else {
            setIsAddingNewAddress(true);
          }
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
      } else {
        const localAddresses = JSON.parse(
          localStorage.getItem("vibe_shipping_addresses_v2") || "[]",
        );
        setSavedAddresses(localAddresses);
        if (localAddresses.length > 0) setSelectedAddressId(localAddresses[0].id);
        else setIsAddingNewAddress(true);
        setIsLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubSettings();
      unsubPaymentSettings();
      unsubPayments();
    };
  }, [navigate]);

  const [hasFullAdvanceProduct, setHasFullAdvanceProduct] = useState(false);
  const [cashOnRulesSellerInfo, setCashOnRulesSellerInfo] = useState<{
    active: boolean;
    voiceUrl: string;
    bkash?: string;
    nagad?: string;
    approved?: boolean;
    bkashGatewayUrl?: string;
    nagadGatewayUrl?: string;
  } | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<"bkash" | "nagad">("bkash");
  const [hasVoiceEnded, setHasVoiceEnded] = useState(false);
  
  // Cash on Rules Realtime State
  const [pendingCashOnRulesOrderId, setPendingCashOnRulesOrderId] = useState<string | null>(null);
  const [isCreatingCashOnRulesOrder, setIsCreatingCashOnRulesOrder] = useState(false);
  const [cashOnRulesApprovedBySeller, setCashOnRulesApprovedBySeller] = useState(false);
  const [cashOnRulesApprovedGatewayUrl, setCashOnRulesApprovedGatewayUrl] = useState("");
  const [cashOnRulesApprovedGatewayType, setCashOnRulesApprovedGatewayType] = useState<"bkash" | "nagad">("bkash");

  const ensureCashOnRulesOrderCreated = async () => {
    if (pendingCashOnRulesOrderId) return pendingCashOnRulesOrderId;
    const activeAddress = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
    if (!activeAddress) {
      notify("Please select or enter a shipping address first", "error");
      return null;
    }
    try {
      setIsCreatingCashOnRulesOrder(true);
      const firstSellerId = items.find((i) => i.sellerId)?.sellerId || null;
      const orderData = {
        userId: auth.currentUser?.uid || "guest",
        customerName: activeAddress.name || "Customer",
        items: items.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          priceAtPurchase: i.price,
          name: i.name,
          image: i.image,
          sellerId: i.sellerId || null,
        })),
        total: total,
        subTotal: subtotal,
        discount: discount,
        advanceAmount: 150,
        deliveryFee: deliveryFee,
        status: OrderStatus.PENDING,
        paymentType: "cash_on_rules",
        paymentMethod: "Cash on Delivery with Rules",
        paymentOption: "Pending Seller Approval",
        cashOnRulesApproved: false,
        sellerId: firstSellerId,
        shippingAddress: activeAddress.address,
        contactNumber: activeAddress.phone,
        altNumber: activeAddress.altPhone || "",
        createdAt: Date.now(),
        isSuspicious: false,
      };
      const docRef = await addDoc(collection(db, "orders"), orderData);
      setPendingCashOnRulesOrderId(docRef.id);
      notify("অর্ডারটি সেলার ড্যাশবোর্ডে অনুমোদনের জন্য জমা হয়েছে!", "success");
      return docRef.id;
    } catch (err) {
      console.error("Failed to create pending order:", err);
      notify("Failed to submit order for approval", "error");
      return null;
    } finally {
      setIsCreatingCashOnRulesOrder(false);
    }
  };

  useEffect(() => {
    if (!pendingCashOnRulesOrderId) return;
    const unsub = onSnapshot(doc(db, "orders", pendingCashOnRulesOrderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.cashOnRulesApproved) {
          setCashOnRulesApprovedBySeller(true);
          if (data.gatewayUrl) setCashOnRulesApprovedGatewayUrl(data.gatewayUrl);
          if (data.gatewayType) setCashOnRulesApprovedGatewayType(data.gatewayType);
          notify("🎉 সেলার আপনার অর্ডার এবং পেমেন্ট অনুমোদিত করেছেন!", "success");
        } else {
          setCashOnRulesApprovedBySeller(false);
        }
      }
    });
    return () => unsub();
  }, [pendingCashOnRulesOrderId]);

  useEffect(() => {
    const resolveAdvance = async () => {
      let totalAdvance = 0;
      let fullAdvanceFound = false;
      let hasCashOnRules = false;
      let cashOnRulesVoice = "";
      let cashOnRulesBkash = "";
      let cashOnRulesNagad = "";
      let cashOnRulesApproved = settings?.cashOnRulesApproved ?? paymentSettings?.cashOnRulesApproved ?? false;
      let bkashGatewayUrl = settings?.cashOnRulesBkashGatewayUrl || paymentSettings?.cashOnRulesBkashGatewayUrl || "";
      let nagadGatewayUrl = settings?.cashOnRulesNagadGatewayUrl || paymentSettings?.cashOnRulesNagadGatewayUrl || "";

      if (settings?.cashOnRulesActive || paymentSettings?.cashOnRulesActive) {
        hasCashOnRules = true;
        cashOnRulesVoice = settings?.cashOnRulesVoiceUrl || paymentSettings?.cashOnRulesVoiceUrl || "";
        cashOnRulesBkash = settings?.bkashNumber || paymentSettings?.bkashNumber || "";
        cashOnRulesNagad = settings?.nagadNumber || paymentSettings?.nagadNumber || "";
      }

      try {
        const { getDoc, doc } = await import("firebase/firestore");
        for (const item of items) {
          let itemAdvance = null;
          
          const prodSnap = await getDoc(doc(db, "products", item.id));
          const pData = prodSnap.exists() ? prodSnap.data() : (item as any);

          const targetSellerId = item.sellerId || pData?.sellerId;
          if (targetSellerId) {
            const sellerSnap = await getDoc(doc(db, "users", targetSellerId));
            if (sellerSnap.exists()) {
              const sData = sellerSnap.data();
              if (sData.cashOnRulesActive) {
                hasCashOnRules = true;
                if (sData.cashOnRulesVoiceUrl) cashOnRulesVoice = sData.cashOnRulesVoiceUrl;
                if (sData.bkashNumber) cashOnRulesBkash = sData.bkashNumber;
                if (sData.nagadNumber) cashOnRulesNagad = sData.nagadNumber;
                if (sData.cashOnRulesApproved !== undefined) cashOnRulesApproved = !!sData.cashOnRulesApproved;
                if (sData.cashOnRulesBkashGatewayUrl) bkashGatewayUrl = sData.cashOnRulesBkashGatewayUrl;
                if (sData.cashOnRulesNagadGatewayUrl) nagadGatewayUrl = sData.cashOnRulesNagadGatewayUrl;
              }
              if (sData.bkashNumber || sData.nagadNumber) {
                setSellerPaymentNumbers({ bkash: sData.bkashNumber || "", nagad: sData.nagadNumber || "" });
              }
            }
          }

          if (pData?.advanceType === "full" || (item as any)?.advanceType === "full") {
            fullAdvanceFound = true;
            itemAdvance = Number(item.price || pData.price || 0);
          } else if (pData?.advanceType === "custom" || pData?.advanceMode || pData?.advancePercentage) {
            if (pData.advanceMode === "percentage" && pData.advancePercentage > 0) {
              itemAdvance = Math.round((Number(item.price || pData.price || 0) * (Number(pData.advancePercentage) / 100)));
            } else if (pData.advanceAmount !== undefined && pData.advanceAmount !== null && pData.advanceAmount !== "") {
              itemAdvance = Number(pData.advanceAmount);
            }
          } else if (item.advanceAmount !== undefined && item.advanceAmount !== null && item.advanceAmount !== "") {
            itemAdvance = Number(item.advanceAmount);
          }
          
          // 2. If not product-specific, check seller's defaultAdvanceAmount
          if (itemAdvance === null && item.sellerId) {
            const sellerSnap = await getDoc(doc(db, "users", item.sellerId));
            if (sellerSnap.exists()) {
              if (sellerSnap.data().defaultAdvanceAmount !== undefined && sellerSnap.data().defaultAdvanceAmount !== null && sellerSnap.data().defaultAdvanceAmount !== "") {
                itemAdvance = Number(sellerSnap.data().defaultAdvanceAmount);
              }
              if (sellerSnap.data().bkashNumber || sellerSnap.data().nagadNumber) {
                setSellerPaymentNumbers({ bkash: sellerSnap.data().bkashNumber || "", nagad: sellerSnap.data().nagadNumber || "" });
              }
            }
          }
          
          // 3. Fallback to delivery charge if none is specified
          if (itemAdvance === null) {
            itemAdvance = settings?.deliveryCharge || 120;
          }
          
          totalAdvance += itemAdvance * (item.quantity || 1);
        }

        if (hasCashOnRules) {
          setCashOnRulesSellerInfo({
            active: true,
            voiceUrl: cashOnRulesVoice,
            bkash: cashOnRulesBkash,
            nagad: cashOnRulesNagad,
            approved: cashOnRulesApproved,
            bkashGatewayUrl: bkashGatewayUrl,
            nagadGatewayUrl: nagadGatewayUrl,
          });
          setPaymentType("cash_on_rules");
        }

        setResolvedAdvanceAmount(totalAdvance);
        setHasFullAdvanceProduct(fullAdvanceFound);
        if (fullAdvanceFound && !hasCashOnRules) {
          setPaymentType("advance");
          setAdvanceType("full");
        }
      } catch (err) {
        console.error("Error resolving advance amount:", err);
        setResolvedAdvanceAmount(deliveryFee);
      }
    };
    
    if (items.length > 0) {
      resolveAdvance();
    }
  }, [items, settings]);

  const subtotal = items.reduce((a, c) => a + c.price * c.quantity, 0);
  const deliveryFee = settings?.deliveryCharge || 120;
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === "percent")
      discount = Math.round(subtotal * (appliedPromo.discount / 100));
    else discount = appliedPromo.discount;
  }
  const total = subtotal + deliveryFee - discount;

  const handleSaveAddress = async () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.address) {
      return notify("Please complete all required fields.", "error");
    }
    if (isForbiddenNumber(newAddress.phone)) {
      return notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়। (This number is not allowed)", "error");
    }
    const newAddrObj = {
      id: Math.random().toString(36).substring(7),
      ...newAddress,
    };
    const newAddrs = [...savedAddresses, newAddrObj];
    const u = auth.currentUser;
    if (u) {
      try {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(
          doc(db, "users", u.uid),
          { 
            addresses: newAddrs,
            address: newAddress.address
          },
          { merge: true },
        );
        setSavedAddresses(newAddrs);
        setSelectedAddressId(newAddrObj.id);
        setIsAddingNewAddress(false);
        notify("Address saved to account.", "success");
      } catch (e) {
        notify("Error saving address.", "error");
      }
    } else {
      setSavedAddresses(newAddrs);
      setSelectedAddressId(newAddrObj.id);
      setIsAddingNewAddress(false);
      localStorage.setItem(
        "vibe_shipping_addresses_v2",
        JSON.stringify(newAddrs),
      );
      notify("Address saved locally.", "success");
    }
  };

  const applyPromo = async () => {
    setCouponError("");
    if (!couponCode.trim()) return;
    try {
      const { query, where, getDocs, collection } =
        await import("firebase/firestore");
      // Search promo_codes first
      const qPromo = query(
        collection(db, "promo_codes"),
        where("code", "==", couponCode.trim().toUpperCase()),
      );
      let snap = await getDocs(qPromo);
      
      let isVoucher = false;
      if (snap.empty) {
         // Search coupons collection as fallback
         const qCoupon = query(
            collection(db, "coupons"),
            where("code", "==", couponCode.trim().toUpperCase()),
         );
         snap = await getDocs(qCoupon);
         isVoucher = true;
      }
      
      if (snap.empty) {
        setCouponError("Invalid promo/coupon code");
      } else {
        const c = snap.docs[0].data();
        if (!c.isActive) {
          setCouponError("Promo code inactive");
        } else if (c.expiresAt && c.expiresAt < Date.now()) {
          setCouponError("Promo code expired");
        } else if (c.minOrderAmount && subtotal < c.minOrderAmount) {
          setCouponError(`Minimum order amount is ${formatPrice(c.minOrderAmount)}`);
        } else if (c.maxUses && c.usedCount >= c.maxUses) {
          setCouponError("Promo code fully used");
        } else {
          setAppliedPromo({ id: snap.docs[0].id, ...c, isVoucher });
          notify("Promo code applied!", "success");
        }
      }
    } catch (e) {
      setCouponError("Error verifying promo code");
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setCouponCode("");
  };

  const placeOrder = async () => {
    if (!navigator.onLine) {
        window.dispatchEvent(new Event("showNetworkError"));
        return;
    }

    // Rate Limiting to prevent spam orders
    const lastOrder = localStorage.getItem("vibe_last_order");
    const now = Date.now();
    if (lastOrder && now - parseInt(lastOrder) < 1000 * 60) { // 1 minute limit per IP/Browser
       return notify("You are placing orders too quickly. Please wait a moment.", "error");
    }

    const activeAddress = savedAddresses.find(
      (a) => a.id === selectedAddressId,
    );
    if (!activeAddress) return notify("Address required", "error");

    if (isForbiddenNumber(activeAddress.phone) || isForbiddenNumber(senderNumber) || isForbiddenNumber(trxId)) {
      return notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়। (This number is not allowed)", "error");
    }

    if (paymentType === "vgcoin") {
      const coinCost = advanceType === "full" ? total : (resolvedAdvanceAmount ?? deliveryFee);
      if (userCoins < coinCost) {
        notify(`Not enough DP Coins. You need ${coinCost - userCoins} more coins. Please deposit.`, "error");
        navigate("/deposit", { state: { requiredDeposit: coinCost - userCoins } });
        return;
      }
    }

    setIsLoading(true);
    try {
      let paymentStr = "Cash on Delivery";
      let paymentOptStr = "N/A";
      let trxStr = "";

      if (paymentType === "cash_on_rules") {
        paymentStr = `Cash on Delivery with Rules (${selectedGateway === "bkash" ? "bKash Gateway" : "Nagad Gateway"})`;
        paymentOptStr = "Paid ৳150 Delivery Fee via Gateway";
        trxStr = `COR_${selectedGateway.toUpperCase()}_${Date.now()}`;
      } else if (paymentType === "advance") {
        paymentStr =
          bankingMethod === "bangla_qr"
            ? "bKash or Nagad"
            : "Bank Transfer";
        paymentOptStr =
          advanceType === "full" ? "Full Payment" : "Delivery Fee Advanced";
        trxStr = bankingTrxId.trim();
      } else if (paymentType === "vgcoin") {
        paymentStr = "DP Coins";
        paymentOptStr =
          advanceType === "full" ? "Full Payment" : "Delivery Fee Advanced";
        trxStr = `VGCOIN_${Date.now()}`;
      }

      const orderData = {
        userId: auth.currentUser?.uid || "guest",
        customerName: activeAddress.name,
        items: items.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          priceAtPurchase: i.price,
          name: i.name,
          image: i.image,
          sellerId: i.sellerId || null,
        })),
        total: total,
        subTotal: subtotal,
        discount: discount,
        advanceAmount: resolvedAdvanceAmount ?? deliveryFee,
        deliveryFee: deliveryFee,
        couponCode: appliedPromo ? appliedPromo.code : null,
        status: paymentType === "advance" ? "payment_pending" : OrderStatus.PENDING,
        paymentMethod: paymentStr,
        paymentOption: paymentOptStr,
        accountNameSender: paymentType === "advance" ? "" : bankingAccountName.trim(),
        transactionId: paymentType === "advance" ? "" : trxStr,
        shippingAddress: activeAddress.address,
        contactNumber: activeAddress.phone,
        altNumber: activeAddress.altPhone || "",
        ipAddress: userIp,
        createdAt: Date.now(),
        isSuspicious: false,
        riskReason: "",
        isGift: isGift,
        giftNote: isGift ? giftNote : null,
        affiliateRef: affiliateRef || null,
        gatewayUsed: paymentType === "cash_on_rules" ? selectedGateway : null,
      };

      let finalDocId = "";
      if (paymentType === "cash_on_rules" && pendingCashOnRulesOrderId) {
        finalDocId = pendingCashOnRulesOrderId;
        await updateDoc(doc(db, "orders", pendingCashOnRulesOrderId), {
          status: (cashOnRulesSellerInfo?.approved || cashOnRulesApprovedBySeller) ? OrderStatus.APPROVED : OrderStatus.PENDING,
          paymentMethod: paymentStr,
          paymentOption: (cashOnRulesSellerInfo?.approved || cashOnRulesApprovedBySeller) ? "Paid ৳150 Delivery Fee via Gateway" : "Pending Seller Approval",
          gatewayUsed: cashOnRulesApprovedGatewayType || selectedGateway,
          gatewayUrl: cashOnRulesApprovedGatewayUrl || "",
          total: total,
          shippingAddress: activeAddress.address,
          contactNumber: activeAddress.phone,
          altNumber: activeAddress.altPhone || "",
        });
      } else {
        const docRef = await addDoc(collection(db, "orders"), orderData);
        finalDocId = docRef.id;
      }

      const openGUrl = cashOnRulesApprovedGatewayUrl || (selectedGateway === "bkash" ? cashOnRulesSellerInfo?.bkashGatewayUrl : cashOnRulesSellerInfo?.nagadGatewayUrl);
      if (paymentType === "cash_on_rules" && (cashOnRulesSellerInfo?.approved || cashOnRulesApprovedBySeller) && openGUrl) {
        try {
          window.open(openGUrl, "_blank");
        } catch (e) {
          console.error("Gateway open error:", e);
        }
      }

      // Notify sellers of the new order ONLY for non-advance (or COD/VG Coin) orders immediately
      if (paymentType !== "advance") {
        try {
          const uniqueSellerIds = Array.from(new Set(orderData.items.map(item => item.sellerId).filter(Boolean)));
          uniqueSellerIds.forEach((sellerId) => {
            fetch("/api/send-push-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: sellerId,
                title: "New Customer Order! 🛍️",
                body: `You received a new order from ${activeAddress.name} for ৳${total}.`,
                link: "/seller/dashboard"
              })
            }).catch(err => console.error("Seller push notification failed:", err));
          });

          // Notify admins of new order
          fetch("/api/send-push-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "New Customer Order! 🛍️",
              body: `A new order was placed by ${activeAddress.name} for ৳${total}.`,
              link: "/admin/orders"
            })
          }).catch(err => console.error("Admin order push failed:", err));

          // Notify the seller
          const sellerId = orderData.items?.[0]?.sellerId;
          if (sellerId) {
            fetch("/api/web-push/send-order", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ sellerId, orderId: docRef.id })
            }).catch(console.error);
          }
          
          // Notify the customer themselves
          if (user?.uid) {
            fetch("/api/send-push-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user.uid,
                title: "Order Placed Successfully! 🎉",
                body: `Thank you for shopping! Your order for ৳${total} has been received.`,
                link: "/my-orders"
              })
            }).catch(err => console.error("Customer order push failed:", err));
          }
        } catch (e) {
          console.error("Failed to send order push notifications:", e);
        }
      }

      if (orderData.affiliateRef) {
        try {
          const { increment } = await import("firebase/firestore");
          await updateDoc(doc(db, "users", orderData.affiliateRef), {
            walletBalance: increment(50),
          });
          await addDoc(collection(db, "affiliates_log"), {
            affiliateId: orderData.affiliateRef,
            orderId: docRef.id,
            customerName: activeAddress.name,
            commission: 50,
            createdAt: Date.now(),
          });
        } catch (e) {}
      }

      if (appliedPromo && appliedPromo.id !== "affiliate") {
        try {
          const { increment, arrayUnion } = await import("firebase/firestore");
          const collectionName = appliedPromo.isVoucher
            ? "coupons"
            : "promo_codes";
          await updateDoc(doc(db, collectionName, appliedPromo.id), {
            usedCount: increment(1),
            usedIPs: arrayUnion(userIp),
          });
        } catch (e) {}
      }

      if (paymentType === "vgcoin" && auth.currentUser) {
        try {
          const { increment } = await import("firebase/firestore");
          const coinCost = advanceType === "full" ? total : (resolvedAdvanceAmount ?? deliveryFee);
          await handleCoinDeductionWithExpiry(auth.currentUser.uid, coinCost);
        } catch (e) {
          console.error("Failed to deduct coins", e);
        }
      }

      // Grant coins for eligible products
      if (auth.currentUser) {
        let totalCoinsEarned = 0;
        for (const i of items) {
          const baseReward = (i.coinReward !== undefined && i.coinReward !== null && String(i.coinReward).trim() !== "") ? Number(i.coinReward) : getProductCoinReward(i.id);
          const reward = baseReward * i.quantity;
          totalCoinsEarned += reward;
        }
        if (totalCoinsEarned > 0) {
          try {
            const { increment, arrayUnion } = await import("firebase/firestore");
            const expiryAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              coins: increment(totalCoinsEarned),
              coinBatches: arrayUnion({
                  id: Date.now().toString(),
                  amount: totalCoinsEarned,
                  expiresAt: expiryAt,
                  type: "reward"
              })
            });
          } catch (e) {
            console.error("Failed to add reward coins", e);
          }
        }
      }

      if (paymentType !== "advance") {
        await sendOrderToTelegram({ ...orderData, id: finalDocId });
      }

      // Email removed per user request

      localStorage.removeItem("f_cart");
      localStorage.setItem("vibe_last_order", Date.now().toString());

      if (paymentType === "advance") {
        navigate(`/payment/${finalDocId}`);
      } else {
        navigate(`/success?orderId=${finalDocId}`);
      }
    } catch (err: any) {
      notify("Order failed! Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) return !!selectedAddressId;
    if (step === 2) {
      if (paymentType === "cash_on_rules") return true;
      if (paymentType === "cod") return true;
      if (paymentType === "advance") {
        return !!advanceType;
      }
      if (paymentType === "vgcoin") {
        return !!advanceType;
      }
      return false;
    }
    if (step === 3) return agreeToTerms;
    return false;
  };

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2 && paymentType === "cash_on_rules") {
        await ensureCashOnRulesOrderCreated();
      }
      setCurrentStep((p) => Math.min(p + 1, 3));
    } else notify("Please complete the required fields.", "error");
  };

  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 1));

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 flex flex-col gap-6 font-inter bg-zinc-50 dark:bg-[#000000]">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-[#000000] font-inter">
      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-6 py-4 overflow-x-auto no-scrollbar mask-linear-fade pr-4">
          {[
            { step: 1, label: "Shipping", icon: Truck },
            { step: 2, label: "Payment", icon: CreditCard },
            { step: 3, label: "Review", icon: Check },
          ].map(({ step, label, icon: Icon }, index) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-colors",
                    currentStep >= step
                      ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900"
                      : "border-zinc-300 dark:border-zinc-700 text-zinc-400",
                  )}
                >
                  {currentStep > step ? (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-sm font-bold whitespace-nowrap",
                    currentStep >= step
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400",
                  )}
                >
                  {label}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={cn(
                    "w-4 sm:w-8 h-0.5",
                    currentStep > step
                      ? "bg-zinc-100 dark:bg-zinc-8000"
                      : "bg-zinc-200 dark:bg-zinc-800",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Step 1: Shipping */}
            {currentStep === 1 && (
              <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                <CardHeader>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <MapPin className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />{" "}
                    {t('Shipping Information') || 'Shipping Information'}
                  </h2>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  {savedAddresses.length > 0 ? (
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={cn(
                            "p-4 border-2 rounded-2xl cursor-pointer transition-all",
                            selectedAddressId === addr.id
                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 dark:bg-emerald-900/10"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                selectedAddressId === addr.id
                                  ? "border-zinc-900 dark:border-zinc-100"
                                  : "border-zinc-300",
                              )}
                            >
                              {selectedAddressId === addr.id && (
                                <div className="w-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-8000" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                {addr.name}
                              </div>
                              <div className="text-sm font-medium text-zinc-500">
                                {addr.phone}
                              </div>
                              <div className="text-sm mt-1 text-zinc-600 dark:text-zinc-400">
                                {addr.address}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full mt-2 border-dashed"
                        onClick={() => navigate('/shipping-address')}
                      >
                        + Add New Address
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <MapPin className="w-10 h-10 text-zinc-400 mb-3" />
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{t('No Address Found') || 'No Address Found'}</h3>
                      <p className="text-sm text-zinc-500 mb-4">{t('Please add a shipping address to continue.') || 'Please add a shipping address to continue.'}</p>
                      <Button onClick={() => navigate('/shipping-address')}>
                        {t('Add Shipping Address') || 'Add Shipping Address'}
                      </Button>
                    </div>
                  )}

                  {/* Gift Toggle */}
                  <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="gift"
                          checked={isGift}
                          onCheckedChange={(c) => setIsGift(!!c)}
                        />
                        <div>
                          <Label
                            htmlFor="gift"
                            className="font-bold text-base cursor-pointer"
                          >
                            Send as a Gift
                          </Label>
                          <p className="text-sm text-zinc-500">
                            Invoice will hide prices. COD disabled.
                          </p>
                        </div>
                      </div>
                      {isGift && (
                        <div className="space-y-2 ml-7">
                          <Label>Gift Note</Label>
                          <Input
                            placeholder="Happy Birthday!..."
                            value={giftNote}
                            onChange={(e) => setGiftNote(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-4 pb-2">
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep(1)}
                    size="default"
                    className="text-xs sm:text-sm px-4 sm:px-6"
                  >
                    Continue
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                <CardHeader>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <CreditCard className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />{" "}
                    Payment Information
                  </h2>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  {cashOnRulesSellerInfo?.active ? (
                    <div className="space-y-6">
                      {/* Pill Shape Button */}
                      <button
                        type="button"
                        onClick={() => setPaymentType("cash_on_rules")}
                        className={cn(
                          "w-full max-w-md mx-auto flex items-center justify-between gap-2 px-4 py-2.5 sm:py-3 border-2 rounded-full transition-all duration-300 font-bold text-xs sm:text-sm shadow-sm my-1",
                          paymentType === "cash_on_rules"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-amber-300 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 shrink-0">
                          <div className="p-1.5 bg-amber-500 text-white rounded-full shadow-sm shrink-0">
                            <Truck className="h-4 w-4" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold whitespace-nowrap">Cash on with rules</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cashOnRulesSellerInfo?.approved ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                              ✓ Approved
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                              ⏳ Approval Needed
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Content when Cash on with rules is selected */}
                      {paymentType === "cash_on_rules" && (
                        <div className="space-y-5 bg-zinc-50 dark:bg-zinc-900/90 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-300">
                          {/* Voice Message Bubble */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
                                🔊 ভয়েস মেসেজ শুনুন
                              </span>
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                অডিও প্লে করুন
                              </span>
                            </div>

                            <VoiceMessageBubble
                              audioSrc={cashOnRulesSellerInfo.voiceUrl}
                              duration={20}
                              isMe={false}
                              className="w-full max-w-md shadow-md border border-zinc-200 dark:border-zinc-700"
                              onEnded={() => setHasVoiceEnded(true)}
                            />
                          </div>

                          {/* Instruction text & links */}
                          <div className="space-y-4 pt-2">
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/40 dark:to-zinc-900 border-2 border-amber-300/60 dark:border-amber-700/40 p-4 rounded-2xl space-y-3 font-['Hind_Siliguri',sans-serif] text-zinc-800 dark:text-zinc-200">
                              <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400 text-base">
                                <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                                <span>অর্ডার কনফার্ম করার নিয়মাবলি</span>
                              </div>

                              <p className="text-sm leading-relaxed font-medium">
                                আপনার অর্ডার করার জন্য বিকাশ বা নগদে ফোনের দাম (<span className="font-bold text-indigo-600 dark:text-indigo-400">৳{subtotal}</span>) এবং ডেলিভারি চার্জ (<span className="font-bold text-amber-600 dark:text-amber-400">৳150</span>) ডিপোজিট করে রাখুন।
                              </p>

                              <div className="bg-white/90 dark:bg-zinc-800/90 p-3 rounded-xl border border-amber-200 dark:border-zinc-700 text-xs font-medium space-y-1">
                                <p className="text-zinc-900 dark:text-zinc-100 font-bold">
                                  💡 অফিশিয়াল পেমেন্ট গেটওয়ের মাধ্যমে আপনার থেকে মাত্র ৳১৫০ ডেলিভারি চার্জ নেওয়া হবে।
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-300">
                                  ডিপোজিট সম্পন্ন করে স্ক্রিন রেকর্ড করে মেসেজে Telegram বা WhatsApp-এ পাঠালে আপনার অর্ডারটি ফাইনাল কনফার্ম হবে।
                                </p>
                              </div>

                              {(cashOnRulesSellerInfo.bkash || cashOnRulesSellerInfo.nagad || sellerPaymentNumbers) && (
                                <div className="pt-1 flex flex-wrap gap-2 text-xs font-mono">
                                  {(cashOnRulesSellerInfo.bkash || sellerPaymentNumbers?.bkash) && (
                                    <div className="bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 px-3 py-1.5 rounded-lg border border-pink-300/50 font-bold">
                                      bKash: {cashOnRulesSellerInfo.bkash || sellerPaymentNumbers?.bkash}
                                    </div>
                                  )}
                                  {(cashOnRulesSellerInfo.nagad || sellerPaymentNumbers?.nagad) && (
                                    <div className="bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-lg border border-orange-300/50 font-bold">
                                      Nagad: {cashOnRulesSellerInfo.nagad || sellerPaymentNumbers?.nagad}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Direct Message Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <a
                                href="https://t.me/deepshopback"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  await ensureCashOnRulesOrderCreated();
                                  window.open("https://t.me/deepshopback", "_blank");
                                }}
                                className="flex items-center justify-center gap-2.5 bg-[#229ED9] hover:bg-[#1f8fbd] text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                              >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.42-1.42-.88.03-.24.38-.49 1.07-.75 4.19-1.82 6.99-3.02 8.39-3.6 3.99-1.66 4.82-1.95 5.36-1.96.12 0 .38.03.55.17.14.12.18.28.2.42 0 .06.01.19 0 .28z"/>
                                </svg>
                                Message in Telegram
                              </a>

                              <a
                                href="https://wa.me/17247648185"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  await ensureCashOnRulesOrderCreated();
                                  window.open("https://wa.me/17247648185", "_blank");
                                }}
                                className="flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                              >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                </svg>
                                Message in WhatsApp
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {!isForeign && (
                      <button
                        disabled={isGift || isCodDisabledBySellers || hasFullAdvanceProduct}
                        onClick={() => setPaymentType("cod")}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 border-2 rounded-2xl transition-colors",
                          paymentType === "cod"
                            ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 dark:bg-emerald-900/10"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                          (isGift || isCodDisabledBySellers || hasFullAdvanceProduct) && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <Truck className="h-8 w-8 text-zinc-700 dark:text-zinc-300" />
                        <div className="text-center">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            Cash on Delivery
                          </div>
                          <div className="text-xs font-semibold text-zinc-500 mt-1">
                            {hasFullAdvanceProduct ? "Full Payment Advance Required" : "Pay rest on delivery"}
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setPaymentType("advance");
                        if (isForeign) {
                          setAdvanceType("full");
                          setBankingMethod("bank");
                        } else {
                          setBankingMethod("bangla_qr");
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 border-2 rounded-2xl transition-colors",
                        paymentType === "advance"
                          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 dark:bg-emerald-900/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                      )}
                    >
                      <Smartphone className="h-8 w-8 text-zinc-700 dark:text-zinc-300" />
                      <div className="text-center">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {isForeign ? "Bank Transfer" : "bKash or Nagad"}
                        </div>
                        <div className="text-xs font-semibold text-zinc-500 mt-1">
                          {isForeign ? "Full Advance (1-2 months delivery)" : "bKash & Nagad Payment"}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentType("vgcoin")}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 border-2 rounded-2xl transition-colors",
                        paymentType === "vgcoin"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700",
                      )}
                    >
                      <div className="h-8 w-8 flex items-center justify-center font-bold text-lg text-amber-500 border-2 border-amber-500 rounded-full">
                        D
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1">
                          Pay with DP Coin
                        </div>
                        <div className="text-xs font-bold text-amber-500 mt-1">
                          Balance: {formatPrice(userCoins)}
                        </div>
                      </div>
                    </button>
                  </div>

                  {paymentType === "cod" && (
                    <div className="flex flex-col gap-4 mt-4 border-2 border-[#00b2d6]/30 bg-[#f4fbff] dark:bg-[#00b2d6]/5 dark:border-[#00b2d6]/20 p-5 rounded-2xl animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center gap-2 mb-1 text-[#00b2d6]">
                        <div className="bg-[#00b2d6] text-white rounded-full p-0.5">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                           <Truck className="h-5 w-5 text-[#ce1274]" />
                           Cash on Delivery
                        </span>
                      </div>
                      <div className="space-y-3">
                         <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Cash on Delivery (COD)</p>
                         <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                           <li>Upon delivery to your address, you may pay in cash directly to our courier.</li>
                           <li>Ensure your delivery status is marked as 'Out for Delivery' before agreeing to accept the parcel.</li>
                           <li>Verify that the airway bill clearly indicates the parcel is from DEEP SHOP before receiving it.</li>
                           <li>Before handing over payment to the courier, double-check the order number, sender information, and tracking number on the parcel for accuracy.</li>
                         </ul>
                      </div>
                    </div>
                  )}

                  {paymentType === "vgcoin" && (
                    <div className="flex flex-col gap-6 mt-4 border-t border-amber-100 dark:border-amber-900/30 pt-6 animate-in fade-in slide-in-from-top-4">
                      <div className="space-y-4">
                        <Label className="text-base text-zinc-900 dark:text-zinc-100">
                          {isForeign ? "Confirm Full Payment with Coins" : "Select Amount to Pay with Coins"}
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {!isForeign && !hasFullAdvanceProduct && (
                            <button
                              onClick={() => {
                                const reqAmt = resolvedAdvanceAmount ?? deliveryFee;
                                if (userCoins < reqAmt) {
                                  notify(
                                    `Not enough balance. You need ${formatPrice(reqAmt - userCoins)} more.`,
                                    "error",
                                  );
                                  navigate("/deposit", { state: { requiredDeposit: reqAmt - userCoins } });
                                  return;
                                }
                                setAdvanceType("delivery");
                              }}
                              className={cn(
                                "flex items-center justify-between p-4 border-2 rounded-xl text-left",
                                advanceType === "delivery"
                                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                                  : "border-zinc-200 dark:border-zinc-800",
                              )}
                            >
                              <div>
                                <div className="font-bold">{resolvedAdvanceAmount !== null ? "Required Advance Booking" : "Delivery Fee Only"}</div>
                                <div className="text-xs text-zinc-500">
                                  Requires {formatPrice(resolvedAdvanceAmount ?? deliveryFee)}
                                </div>
                              </div>
                              <div className="font-bold px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-lg">
                                {formatPrice(resolvedAdvanceAmount ?? deliveryFee)}
                              </div>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (userCoins < total) {
                                notify(
                                  `Not enough balance. You need ${formatPrice(total - userCoins)} more.`,
                                  "error",
                                );
                                navigate("/deposit", { state: { requiredDeposit: total - userCoins } });
                                return;
                              }
                              setAdvanceType("full");
                            }}
                            className={cn(
                              "flex items-center justify-between p-4 border-2 rounded-xl text-left",
                              advanceType === "full" || isForeign || hasFullAdvanceProduct
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                                : "border-zinc-200 dark:border-zinc-800",
                            )}
                          >
                            <div>
                              <div className="font-bold">Full Payment</div>
                              <div className="text-xs text-zinc-500">
                                Requires {formatPrice(total)}
                              </div>
                            </div>
                            <div className="font-bold px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-lg">
                              {formatPrice(total)}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentType === "advance" && (
                    <div className="flex flex-col gap-6 mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 animate-in fade-in slide-in-from-top-4">
                      
                      {/* Advance Details Info */}
                      <div className="flex flex-col gap-4 border-2 border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500/20 p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1 text-indigo-600 dark:text-indigo-400">
                          <div className="bg-indigo-600 dark:bg-indigo-500 text-white rounded-full p-0.5">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                          <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                             <Smartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                             Advance Payment
                          </span>
                        </div>
                        <div className="space-y-3">
                           <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Advance Digital Payment</p>
                           {sellerPaymentNumbers ? (
                             <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 mb-4 shadow-sm">
                               <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">Seller Payment Numbers:</p>
                               {sellerPaymentNumbers.bkash && <div className="flex items-center justify-between mb-1"><span className="text-xs text-zinc-500 font-medium">bKash:</span> <span className="font-mono text-sm font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded">{sellerPaymentNumbers.bkash}</span></div>}
                               {sellerPaymentNumbers.nagad && <div className="flex items-center justify-between"><span className="text-xs text-zinc-500 font-medium">Nagad:</span> <span className="font-mono text-sm font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">{sellerPaymentNumbers.nagad}</span></div>}
                             </div>
                           ) : (
                             paymentSettings?.bankInfo && (
                               <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                                 {paymentSettings.bankInfo}
                               </div>
                             )
                           )}
                           <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                             <li>You can securely pay via bKash or Nagad.</li>
                             <li>Paying advance confirms your order immediately for faster processing.</li>
                             <li>Please do not share your bank OTP or PIN with anyone.</li>
                             <li>Save your transaction ID or take a screenshot for your reference.</li>
                           </ul>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-base text-zinc-900 dark:text-zinc-100">
                          Select Amount to Pay Now
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {!isForeign && !hasFullAdvanceProduct && (
                            <button
                              onClick={() => setAdvanceType("delivery")}
                              className={cn(
                                "flex items-center justify-between p-4 border-2 rounded-xl text-left",
                                advanceType === "delivery"
                                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 dark:bg-emerald-900/10"
                                  : "border-zinc-200 dark:border-zinc-800",
                              )}
                            >
                              <div>
                                <div className="font-bold">{resolvedAdvanceAmount !== null ? "Required Advance Booking" : "Delivery Fee Only"}</div>
                                <div className="text-xs text-zinc-500">
                                  Pay rest on arrival
                                </div>
                              </div>
                              <div className="font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                {formatPrice(resolvedAdvanceAmount ?? deliveryFee)}
                              </div>
                            </button>
                          )}
                          <button
                            onClick={() => setAdvanceType("full")}
                            className={cn(
                              "flex items-center justify-between p-4 border-2 rounded-xl text-left",
                              advanceType === "full" || isForeign || hasFullAdvanceProduct
                                ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 dark:bg-emerald-900/10"
                                : "border-zinc-200 dark:border-zinc-800",
                            )}
                          >
                            <div>
                              <div className="font-bold">Full Payment</div>
                              <div className="text-xs text-zinc-500">
                                Secure entire order
                              </div>
                            </div>
                            <div className="font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                              {formatPrice(total)}
                            </div>
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                  </>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-4 pb-2">
                  <Button
                    variant="ghost"
                    className="text-xs sm:text-sm px-2 sm:px-4"
                    onClick={prevStep}
                  >
                    <ChevronLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep(2)}
                    size="default"
                    className="text-xs sm:text-sm px-4 sm:px-6"
                  >
                    Review Order
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                <CardHeader>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <Check className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />{" "}
                    Review Your Order
                  </h2>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-zinc-500">Shipping Details</Label>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-sm font-medium">
                        <p>
                          {
                            savedAddresses.find(
                              (a) => a.id === selectedAddressId,
                            )?.name
                          }
                        </p>
                        <p>
                          {
                            savedAddresses.find(
                              (a) => a.id === selectedAddressId,
                            )?.phone
                          }
                        </p>
                        <p className="mt-2">
                          {
                            savedAddresses.find(
                              (a) => a.id === selectedAddressId,
                            )?.address
                          }
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500">{t('Payment Details') || 'Payment Details'}</Label>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-sm font-medium">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          {paymentType === "cash_on_rules"
                            ? "Cash on Delivery with Rules (Approved Payment)"
                            : paymentType === "cod"
                              ? "Cash on Delivery"
                              : paymentType === "vgcoin"
                                ? `DP Coins (${advanceType})`
                                : `bKash / Nagad Payment (${advanceType === "full" ? "Full Payment" : "Advance Booking"})`}
                        </p>

                        {paymentType === "cash_on_rules" && (
                          (cashOnRulesSellerInfo?.approved || cashOnRulesApprovedBySeller) ? (
                            <div className="mt-3 space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  ✓ সেলার পেমেন্ট অনুমোদন করেছেন!
                                </p>
                                <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">Approved</span>
                              </div>
                              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                ডেলিভারি চার্জ ৳১৫০ পেমেন্ট করার জন্য সেলারের সেট করা গেটওয়ে বাছুন:
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedGateway("bkash")}
                                  className={cn(
                                    "p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                                    selectedGateway === "bkash"
                                      ? "border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-900 dark:text-pink-100 ring-2 ring-pink-500/20"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                  )}
                                >
                                  <span>bKash Gateway</span>
                                  <span className="text-[10px] font-mono font-bold text-pink-600">Pay ৳150</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedGateway("nagad")}
                                  className={cn(
                                    "p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                                    selectedGateway === "nagad"
                                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-100 ring-2 ring-orange-500/20"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                  )}
                                >
                                  <span>Nagad Gateway</span>
                                  <span className="text-[10px] font-mono font-bold text-orange-600">Pay ৳150</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1 text-xs text-amber-900 dark:text-amber-200">
                              <div className="flex items-center gap-1 font-bold">
                                <span>⏳</span>
                                <span>পেমেন্ট গেটওয়ের জন্য সেলার অনুমোদনের অপেক্ষায়...</span>
                              </div>
                              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                সেলার টেলিগ্রাম/হোয়াটসঅ্যাপে আপনার ভয়েস শুনে মেসেজে গেটওয়ে লিংক দিলে এখানে বিকাশ/নগদ গেটওয়ে সক্রিয় হবে।
                              </p>
                            </div>
                          )
                        )}

                        {paymentType === "advance" && (
                          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                            Payment details will be submitted on the next page.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Checkout Policy Notes */}
                  <div className="space-y-4 mb-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="note">
                      <strong>Delivery Notice:</strong> Fast nationwide shipping takes 1-3 business days inside Dhaka, and 3-5 business days outside Dhaka.
                    </p>
                    <p className="note wr">
                      <strong>Important Warning:</strong> Mismatched transaction details or wrong IDs will result in immediate order cancellation. Recording an unboxing video is mandatory for returns.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(c) => setAgreeToTerms(!!c)}
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm font-bold leading-snug cursor-pointer mt-0.5"
                    >
                      I agree to the{" "}
                      <span className="underline text-zinc-800 dark:text-zinc-200">
                        Terms of Service
                      </span>{" "}
                      and{" "}
                      <span className="underline text-zinc-800 dark:text-zinc-200">
                        Privacy Policy
                      </span>
                      . Note: Returns are subjective to warranty policies.
                    </Label>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-row justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-4 pb-2 sm:gap-4 gap-2">
                  <Button
                    variant="ghost"
                    className="text-xs sm:text-sm px-2 sm:px-4"
                    onClick={prevStep}
                  >
                    <ChevronLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Back
                  </Button>
                  <Button
                    onClick={placeOrder}
                    disabled={!validateStep(3) || isLoading}
                    size="default"
                    className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-black/10 dark:shadow-white/10 text-white dark:text-zinc-900 border-0 text-xs sm:text-sm px-3.5 sm:px-5 flex-1 sm:flex-none"
                  >
                    <Lock className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> {paymentType === 'cash_on_rules' ? ((cashOnRulesSellerInfo?.approved || cashOnRulesApprovedBySeller) ? `Pay ৳150 via ${selectedGateway === 'bkash' ? 'bKash' : 'Nagad'} & Complete Order` : 'Submit for Approval') : paymentType === 'advance' ? (t('Checkout & Pay') || 'Checkout & Pay') : (t('Place Order') || 'Complete Order')}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <CardHeader className="bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="text-zinc-500 w-5 h-5" /> {t('Order Summary') || 'Order Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative w-16 h-16 shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 p-1">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                        />
                        <span className="absolute -top-2 -right-2 bg-zinc-900 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </div>
                        <div className="font-bold text-sm text-zinc-500 mt-1">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  {!appliedPromo ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => setShowCouponsModal(true)}
                          variant="outline"
                          className="w-full text-xs font-bold border-dashed border-zinc-300 dark:border-zinc-700 h-10 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800"
                        >
                          <Ticket className="w-4 h-4" /> Select a Voucher
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 px-2">
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">
                          OR
                        </span>
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter Promo/Affiliate Code"
                            value={couponCode}
                            onChange={(e) =>
                              setCouponCode(e.target.value.toUpperCase())
                            }
                            className="h-10 text-xs"
                          />
                          <Button
                            onClick={applyPromo}
                            variant="outline"
                            size="sm"
                            className="h-10 text-xs shrink-0"
                          >
                            Apply
                          </Button>
                        </div>
                        {couponError && (
                          <div className="text-xs font-bold text-red-500">
                            {couponError}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/20 rounded-xl">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                            {appliedPromo.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium ml-6">
                          -
                          {appliedPromo.type === "percent"
                            ? `${appliedPromo.discount}%`
                            : `${formatPrice(appliedPromo.discount)}`}{" "}
                          OFF
                        </span>
                      </div>
                      <button
                        onClick={removePromo}
                        className="text-zinc-500 hover:text-red-500 bg-white dark:bg-zinc-800 rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {showCouponsModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowCouponsModal(false)}
                  >
                    <div
                      className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[32px] md:rounded-[32px] p-6 pb-12 md:pb-6 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                            My Vouchers
                          </h3>
                          <p className="text-xs text-zinc-500">
                            Select a voucher to apply to this order
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCouponsModal(false)}
                          className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
                        {claimedCouponsList
                          .filter(
                            (c) => !(c.expiresAt && c.expiresAt < Date.now()),
                          )
                          .map((c, i) => {
                            const minMet =
                              !c.minOrderAmount || subtotal >= c.minOrderAmount;
                            return (
                              <div
                                key={i}
                                className={`relative rounded-xl border flex overflow-hidden ${minMet ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900" : "border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 opacity-60"}`}
                              >
                                <div
                                  className={`w-[80px] flex flex-col justify-center items-center p-3 text-white ${minMet ? "bg-amber-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
                                >
                                  <span className="text-xl font-black">
                                    {c.type === "percent"
                                      ? `${c.discount}%`
                                      : `${formatPrice(c.discount)}`}
                                  </span>
                                  <span className="text-[10px] font-bold">
                                    OFF
                                  </span>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-center bg-white dark:bg-zinc-900">
                                  <div className="font-bold text-sm mb-0.5">
                                    {c.code}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {c.minOrderAmount > 0
                                      ? `Min purchase ${formatPrice(c.minOrderAmount)}`
                                      : "No minimum"}
                                  </div>
                                  {!minMet && (
                                    <div className="text-[10px] text-red-500 font-bold mt-1">
                                      Need {formatPrice(c.minOrderAmount - subtotal)} more
                                    </div>
                                  )}
                                </div>
                                <button
                                  disabled={!minMet}
                                  onClick={() => {
                                    setAppliedPromo({
                                      id: c.id,
                                      ...c,
                                      isVoucher: true,
                                    });
                                    setCouponCode(c.code);
                                    setShowCouponsModal(false);
                                    notify("Voucher applied!", "success");
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold px-4 py-2 rounded-full disabled:hidden"
                                >
                                  Use
                                </button>
                              </div>
                            );
                          })}
                        {claimedCouponsList.length === 0 && (
                          <div className="text-center py-10">
                            <Ticket className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                            <p className="text-sm font-medium text-zinc-500">
                              You don't have any vouchers
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-sm font-medium">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('Subtotal') || 'Subtotal'}</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-zinc-800 dark:text-zinc-200 font-bold">
                      <span>Discount</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('Delivery Fee') || 'Shipping'}</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-bold">{t('Total') || 'Total'}</span>
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <CustomSectionEmbed location="checkout_bottom" />
    </div>
  );
}
