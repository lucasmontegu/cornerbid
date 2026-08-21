export type Locale = 'en' | 'es';

export const LOCALE_COOKIE = 'cornerbid-locale';

export const messages = {
  en: {
    metaTitle: 'CornerBid — buy the bouncing logo',
    metaDescription:
      'Pay to put your mark on the screensaver. Time on the slot is how your logo racks up corner touches. A visit counts when someone opens your site from the corner modal.',
    unseeded: 'Database not seeded yet — run',
    brand: 'CornerBid',
    navLeaderboard: 'Leaderboard',
    navAbout: 'About',
    navRules: 'Rules',
    terms: 'Rules',
    language: 'Language',
    themeToggle: 'Switch color theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    skipToBid: 'Skip to bid',
    onScreenNow: 'On screen now',
    fomoHeadline: 'Their logo is hitting these corners. Take the bounce.',
    claimFor: 'Take the bouncing logo for',
    tagline:
      'Paying more buys occupancy — more time, more corner touches. Paying less still lists you. The screensaver only shows the current occupant.',
    amountHint:
      'You start from the live highest bid — the current occupant. Whole US dollars, $1 at a time. No ceiling. Taking the bounce costs at least $1 more than #1. Same URL or @handle raises by the difference; the total still starts from that take-the-corner quote.',
    trending: 'Trending touches',
    noTrending: 'No corner touches in the last hour.',
    activity: 'Latest activity',
    noActivity: 'No bids yet. Be the first.',
    clicksPerHour: '{n} touches/h',
    justNow: 'just now',
    minAgo: '{n} min ago',
    hoursAgo: '{n}h ago',
    rankingStats: '{touches} touches · {visits} visits',
    holderStats: '{price} · {touches} touches · {visits} visits',
    takeTheCorner: 'Take the bounce',
    amountLabel: 'Bid amount in US dollars',
    productPlaceholder: 'Your product URL or @handle',
    productLabel: 'Product URL or @handle',
    raiseHint:
      'Already occupying or listed? Enter the same URL or @handle and pay only the difference to stay longer.',
    alreadyCommitted: 'Already committed {paid} · pay {delta} more',
    redirecting: 'Redirecting…',
    takeCornerPay: 'Take the bounce · {price}',
    placeOnBoard: 'List on the board · {price}',
    priceMoved: 'The live occupant moved to {price}. Try again.',
    resolveFail: 'Could not resolve that listing.',
    checkoutFail: 'Checkout failed.',
    close: 'Close',
    lowerBid: 'Lower bid',
    raiseBid: 'Raise bid',
    bidFineprint:
      'Paying more buys occupancy, not faster physics. Time on the slot is how your logo racks up corner touches. If someone outbids you, you lose the bounce but stay on the board — that charge is not refunded. A visit counts when someone opens your site from the corner modal.',
    railStepTitle: 'How do you want to pay?',
    railStepBody:
      'Polar is the default worldwide. If you are in Argentina, you can pay with Mercado Pago Checkout Pro instead.',
    railPolar: 'Polar (default)',
    railPolarHint: 'Card / wallet. Works worldwide.',
    railMp: 'Mercado Pago',
    railMpHint: 'Checkout Pro for Argentina. You can still pick Polar.',
    railContinue: 'Continue to payment',
    railBack: 'Back',
    railEscape: 'Pay with Mercado Pago (Argentina)',
    mpCredentialsMissing:
      'Mercado Pago credentials are missing. Set MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, and MP_USD_ARS_RATE.',
    hitTheCorner: 'It hit the corner',
    celebrateStats: '{touches} touches · {visits} visits',
    successKicker: 'Payment received',
    successTitle: 'If the webhook landed, your mark is in.',
    successBody:
      'Fulfillment happens on the payment webhook, not this page. Beat the occupant and your logo bounces — every extra minute is another chance to hit a corner. If you did not take the slot, you still appear on the board. That charge is not refunded.',
    successCta: 'Watch the bounce',
    visitorsSinceLaunch: '{n} visitors since launch',
    seeStats: 'see stats',
    topBand: 'TOP {n}',
    rankingRowMeta: '{time} · {touches} touches · {visits} visits',
    touchCount: '{n} touches',
    modalTitle: 'The occupant hit a corner',
    modalBody: 'Open {name} — we count a visit only when you go through.',
    modalCta: 'Visit {name}',
    modalDismiss: 'Keep watching',
    aboutTitle: 'About',
    aboutLead:
      'CornerBid sells one bouncing logo. Your mark is what hits the corners of this window. Time on the slot is the product.',
    aboutB1Title: 'Buy the bouncing logo',
    aboutB1:
      'Outbid the occupant and your product or @handle takes the screensaver. Physics keeps bouncing. Longer occupancy means more corner touches.',
    aboutB2Title: 'Raise to stay. Rank is dollars.',
    aboutB2:
      'Same URL or @handle pays only the difference. Paying less than the live occupant still lists you. The bounce only belongs to whoever holds the slot.',
    aboutB3Title: 'Touches vs visits',
    aboutB3:
      'A touch is the physics event: the logo reached a corner. A visit is counted only when someone opens the occupant’s site from the corner modal.',
    rulesTitle: 'Rules',
    rulesIntro:
      'CornerBid is a public screensaver with one occupant. You pay so your logo is the one hitting the corners. Rank on the board is the bid. Value on the screen is time — and the corner touches that time produces.',
    rulesRankTitle: 'The bouncing logo',
    rulesRank1:
      'There is one live occupant. Their mark bounces across this window. Every time it hits a corner, that occupant scores a touch, and a modal offers their site to whoever is watching.',
    rulesRank2:
      'Taking the bounce costs at least $1 more than the current occupant. Paying more buys occupancy, not faster physics. Stay longer and your logo has more chances to hit corners. There is no upper cap. Listings are whole dollars, $1 at a time.',
    rulesRank3:
      'Paying less still lists you on the ranking board at whatever place that bid can take. The screensaver still shows the occupant. Equal bids keep the order they were placed — the older listing stays higher.',
    rulesRank4:
      'Enter the same website or @handle again to raise. The new total must be at least $1 above what you already paid; you only pay the difference. That is how you keep the slot — and keep touching corners. Tracking query strings are ignored. App Store, Play Store, GitHub, and similar platform links are keyed by path.',
    rulesListTitle: 'What you can list',
    rulesList1: 'A product website, or an X @handle.',
    rulesList2:
      'Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger, Signal, and similar.',
    rulesList3: 'Links to sexual content are not allowed.',
    rulesList4: 'Query parameters are stripped. Tracking and affiliate URLs will not keep those parameters.',
    rulesList5: 'Link shorteners are not allowed.',
    rulesAfterTitle: 'After you pay',
    rulesAfter1:
      'A completed payment lists you. If you took the slot, your logo bounces until someone pays more. If you did not, you stay on the board — that charge is not refunded.',
    rulesAfter2:
      'A touch is recorded when the screensaver hits a corner. A visit is recorded only when someone goes through the corner modal to your URL or profile.',
    rulesAfter3: 'You warrant you have the rights to the mark you submit. Listings may be taken down.',
    rulesAfter4: 'Polar is the default checkout worldwide. Mercado Pago Checkout Pro is optional in Argentina.',
  },
  es: {
    metaTitle: 'CornerBid — comprá el logo que rebota',
    metaDescription:
      'Pagás para poner tu marca en el screensaver. El tiempo en el slot es cómo tu logo acumula toques de esquina. Una visita cuenta cuando alguien abre tu sitio desde el modal.',
    unseeded: 'La base todavía no tiene seed — corré',
    brand: 'CornerBid',
    navLeaderboard: 'Ranking',
    navAbout: 'Acerca',
    navRules: 'Reglas',
    terms: 'Reglas',
    language: 'Idioma',
    themeToggle: 'Cambiar tema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    skipToBid: 'Ir a ofertar',
    onScreenNow: 'Ahora en pantalla',
    fomoHeadline: 'Su logo está pegando en estas esquinas. Tomá el rebote.',
    claimFor: 'Tomá el logo que rebota por',
    tagline:
      'Pagar más compra la ocupación: más tiempo, más toques de esquina. Pagar menos igual te lista. El screensaver solo muestra al ocupante.',
    amountHint:
      'Arrancás desde la oferta más alta en vivo — el ocupante actual. Dólares enteros, de a $1. Sin techo. Tomar el rebote cuesta al menos $1 más que el #1. La misma URL o @handle sube pagando la diferencia; el total igual arranca desde esa cotización para tomar la esquina.',
    trending: 'Toques en tendencia',
    noTrending: 'No hay toques de esquina en la última hora.',
    activity: 'Actividad reciente',
    noActivity: 'Todavía no hay ofertas. Sé el primero.',
    clicksPerHour: '{n} toques/h',
    justNow: 'ahora',
    minAgo: 'hace {n} min',
    hoursAgo: 'hace {n} h',
    rankingStats: '{touches} toques · {visits} visitas',
    holderStats: '{price} · {touches} toques · {visits} visitas',
    takeTheCorner: 'Tomá el rebote',
    amountLabel: 'Monto de la oferta en dólares',
    productPlaceholder: 'URL del producto o @handle',
    productLabel: 'URL del producto o @handle',
    raiseHint:
      '¿Ya ocupás o estás listado? Poné la misma URL o @handle y pagás solo la diferencia para quedarte más tiempo.',
    alreadyCommitted: 'Ya comprometiste {paid} · pagás {delta} más',
    redirecting: 'Redirigiendo…',
    takeCornerPay: 'Tomá el rebote · {price}',
    placeOnBoard: 'Listate en el ranking · {price}',
    priceMoved: 'El ocupante en vivo pasó a {price}. Probá de nuevo.',
    resolveFail: 'No pudimos resolver esa ficha.',
    checkoutFail: 'No se pudo iniciar el pago.',
    close: 'Cerrar',
    lowerBid: 'Bajar oferta',
    raiseBid: 'Subir oferta',
    bidFineprint:
      'Pagar más compra ocupación, no física más rápida. El tiempo en el slot es cómo tu logo acumula toques. Si te superan, perdés el rebote pero seguís en el ranking — ese cargo no se reintegra. Una visita cuenta cuando alguien abre tu sitio desde el modal de la esquina.',
    railStepTitle: '¿Cómo querés pagar?',
    railStepBody:
      'Polar es el default en todo el mundo. Si estás en Argentina, podés pagar con Mercado Pago Checkout Pro.',
    railPolar: 'Polar (default)',
    railPolarHint: 'Tarjeta / wallet. Funciona en todo el mundo.',
    railMp: 'Mercado Pago',
    railMpHint: 'Checkout Pro para Argentina. Igual podés elegir Polar.',
    railContinue: 'Seguir al pago',
    railBack: 'Volver',
    railEscape: 'Pagar con Mercado Pago (Argentina)',
    mpCredentialsMissing:
      'Faltan credenciales de Mercado Pago. Configurá MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET y MP_USD_ARS_RATE.',
    hitTheCorner: 'Pegó en la esquina',
    celebrateStats: '{touches} toques · {visits} visitas',
    successKicker: 'Pago recibido',
    successTitle: 'Si el webhook llegó, tu marca ya está.',
    successBody:
      'La confirmación la hace el webhook, no esta página. Si le ganás al ocupante, tu logo rebota: cada minuto extra es otra chance de pegar en una esquina. Si no tomaste el slot, igual aparecés en el ranking. Ese cargo no se reintegra.',
    successCta: 'Ver el rebote',
    visitorsSinceLaunch: '{n} visitantes desde el lanzamiento',
    seeStats: 'ver stats',
    topBand: 'TOP {n}',
    rankingRowMeta: '{time} · {touches} toques · {visits} visitas',
    touchCount: '{n} toques',
    modalTitle: 'El ocupante pegó en una esquina',
    modalBody: 'Abrí {name} — la visita cuenta solo cuando pasás por acá.',
    modalCta: 'Visitar {name}',
    modalDismiss: 'Seguir mirando',
    aboutTitle: 'Acerca',
    aboutLead:
      'CornerBid vende un logo que rebota. Tu marca es la que pega en las esquinas de esta ventana. El tiempo en el slot es el producto.',
    aboutB1Title: 'Comprá el logo que rebota',
    aboutB1:
      'Superá al ocupante y tu producto o @handle toma el screensaver. La física sigue rebotando. Más tiempo ocupado, más toques de esquina.',
    aboutB2Title: 'Subí para quedarte. El ranking son dólares.',
    aboutB2:
      'La misma URL o @handle paga solo la diferencia. Pagar menos que el ocupante igual te lista. El rebote es de quien tiene el slot.',
    aboutB3Title: 'Toques vs visitas',
    aboutB3:
      'Un toque es el evento de física: el logo llegó a una esquina. Una visita se cuenta solo cuando alguien abre el sitio del ocupante desde el modal.',
    rulesTitle: 'Reglas',
    rulesIntro:
      'CornerBid es un screensaver público con un ocupante. Pagás para que tu logo sea el que pega en las esquinas. El ranking es la oferta. El valor en pantalla es el tiempo — y los toques que ese tiempo produce.',
    rulesRankTitle: 'El logo que rebota',
    rulesRank1:
      'Hay un ocupante en vivo. Su marca rebota por esta ventana. Cada vez que pega en una esquina, ese ocupante suma un toque, y un modal ofrece su sitio a quien está mirando.',
    rulesRank2:
      'Tomar el rebote cuesta al menos $1 más que el ocupante. Pagar más compra ocupación, no física más rápida. Quedate más tiempo y tu logo tiene más chances de pegar. No hay techo. Dólares enteros, de a $1.',
    rulesRank3:
      'Pagar menos igual te lista en el ranking en el puesto que esa oferta pueda tomar. El screensaver sigue mostrando al ocupante. Ofertas iguales conservan el orden: la más vieja queda más arriba.',
    rulesRank4:
      'Volvé a ingresar el mismo sitio o @handle para subir. El total nuevo tiene que ser al menos $1 más que lo ya pagado; solo pagás la diferencia. Así te quedás el slot — y seguís pegando esquinas. Se ignoran query strings de tracking. App Store, Play Store, GitHub y similares se clavean por path.',
    rulesListTitle: 'Qué podés listar',
    rulesList1: 'Un sitio de producto, o un @handle de X.',
    rulesList2:
      'No se permiten links de chat o invitaciones — Telegram, WhatsApp, Discord, Messenger, Signal y similares.',
    rulesList3: 'No se permite contenido sexual.',
    rulesList4: 'Se recortan los query params. URLs de tracking o afiliados no los conservan.',
    rulesList5: 'No se permiten acortadores de links.',
    rulesAfterTitle: 'Después de pagar',
    rulesAfter1:
      'Un pago completo te lista. Si tomaste el slot, tu logo rebota hasta que alguien pague más. Si no, seguís en el ranking — ese cargo no se reintegra.',
    rulesAfter2:
      'Un toque se registra cuando el screensaver pega en una esquina. Una visita se registra solo cuando alguien entra a tu URL o perfil desde el modal.',
    rulesAfter3: 'Declarás derechos sobre la marca. Las fichas se pueden bajar.',
    rulesAfter4: 'Polar es el checkout default en todo el mundo. Mercado Pago Checkout Pro es opcional en Argentina.',
  },
} as const;

export type MessageKey = keyof (typeof messages)['en'];

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  const first = header?.split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('es')) return 'es';
  return 'en';
}
