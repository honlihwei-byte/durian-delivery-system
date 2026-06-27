import type { DeliveryTimeType, OrderStatus, ProductId } from "@/lib/types";

export type Language = "ms" | "zh" | "en";

export const LANGUAGES: Language[] = ["ms", "zh", "en"];

export const LANGUAGE_STORAGE_KEY = "musang-king-language";

export type Translations = {
  languageNames: Record<Language, string>;
  languageSwitcherAria: string;
  hero: {
    tagline: string;
    title: string;
    subtitle: string;
    description: string;
    alt: string;
  };
  footer: string;
  form: {
    scheduleTitle: string;
    scheduleNotice: string;
    name: string;
    namePlaceholder: string;
    whatsapp: string;
    whatsappPlaceholder: string;
    address: string;
    addressPlaceholder: string;
    packages: string;
    deliveryDate: string;
    deliveryDateTomorrow: string;
    deliveryTime: string;
    deliveryTimeRecommended: string;
    preferredTime: string;
    preferredTimePlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    paymentTitle: string;
    paymentDescription: string;
    submit: string;
    submitting: string;
    quantity: string;
    decreaseAria: string;
    increaseAria: string;
    singleDeliveryNote: string;
    promoDeliveryNote: string;
  };
  summary: {
    title: string;
    empty: string;
    productSubtotal: string;
    deliveryFee: string;
    free: string;
    total: string;
  };
  deliveryTime: Record<DeliveryTimeType, string>;
  deliveryTimeAnytime: string;
  products: Record<
    ProductId,
    {
      name: string;
      description: string;
    }
  >;
  success: {
    title: string;
    message: string;
    orderNumber: string;
    trackingLink: string;
    copyLink: string;
    linkCopied: string;
    shareWhatsApp: string;
    saveLink: string;
    newOrder: string;
    whatsappMessage: string;
  };
  track: {
    pageTitle: string;
    pageSubtitle: string;
    loading: string;
    notFoundTitle: string;
    notFoundMessage: string;
    orderNumber: string;
    statusTitle: string;
    detailsTitle: string;
    deliveryTitle: string;
    deliveryDate: string;
    deliveryTime: string;
    deliveryNote: string;
    customerNotes: string;
    loadError: string;
  };
  status: Record<OrderStatus, string>;
  errors: {
    selectPackage: string;
    placeOrderFailed: string;
    nameRequired: string;
    nameTooLong: string;
    whatsappRequired: string;
    whatsappInvalid: string;
    addressRequired: string;
    addressTooLong: string;
    deliveryTimeRequired: string;
    preferredTimeRequired: string;
    preferredTimeTooLong: string;
    notesTooLong: string;
    maxQuantity: string;
    invalidCart: string;
  };
};
