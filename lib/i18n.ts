export type Locale = 'en' | 'es';

/** Legacy cookie — never read. Cleared on the client so it cannot pin English. */
export const LOCALE_COOKIE = 'cornerbid-locale';

export const messages = {
  en: {
    metaTitle: 'CornerBid — buy the bouncing logo',
    metaDescription:
      'Pay to put your mark on the screensaver. Time on the slot is how your logo racks up corner hits. A visit counts when someone opens your site from the corner modal.',
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
    fomoHeadline: 'Right now, that is someone else’s logo hitting the corner.',
    fomoSub:
      'Twenty years of waiting for the DVD logo to land in a corner. Pay more than they did and the next one is yours.',
    claimFor: 'Take the corner for',
    tagline:
      'Paying more buys occupancy — more time, more corner hits. Paying less still lists you. The screensaver only shows the current occupant.',
    amountHint: 'Whole dollars, no ceiling. Less than the top bid still puts you on the board.',
    amountHintMore: 'How the price works',
    trending: 'Trending hits',
    noTrending: 'No corner hits in the last hour.',
    activity: 'Latest activity',
    noActivity: 'No bids yet. The first one takes the corner.',
    clicksPerHour: '{n} hits/h',
    justNow: 'just now',
    minAgo: '{n} min ago',
    hoursAgo: '{n}h ago',
    rankingStats: '{touches} hits · {visits} visits',
    holderStats: '{price} · {touches} hits · {visits} visits',
    takeTheCorner: 'Take the corner',
    amountLabel: 'Bid amount in US dollars',
    productPlaceholder: 'Your product URL or @handle',
    productLabel: 'Product URL or @handle',
    raiseHint:
      'Already occupying or listed? Enter the same URL or @handle and pay only the difference to stay longer.',
    alreadyCommitted: 'Already committed {paid} · pay {delta} more',
    redirecting: 'Redirecting…',
    takeCornerPay: 'Take the corner · {price}',
    placeOnBoard: 'List on the board · {price}',
    priceMoved: 'The live occupant moved to {price}. Check the new amount and pay again.',
    resolveFail: 'Unable to read that link. Enter a product URL or an X @handle.',
    checkoutFail: 'Unable to start checkout. Check your connection and try again.',
    close: 'Close',
    lowerBid: 'Lower bid',
    raiseBid: 'Raise bid',
    bidFineprint:
      'If someone pays more, you keep your place on the board but lose the corner. That charge is not refunded.',
    mpCredentialsMissing: 'Payments are unavailable right now. Try again in a few minutes.',
    paypalCredentialsMissing: 'PayPal is unavailable right now. Pay with Mercado Pago instead.',
    railModalTitle: 'How do you want to pay?',
    railModalBody: 'Both charge {price} for the same slot.',
    railPayPal: 'Pay with PayPal',
    railPayPalHint: 'Card or PayPal balance. Charged in US dollars.',
    railMercadoPago: 'Pay with Mercado Pago',
    railMercadoPagoHint: 'Argentine cards and transfers. Charged in pesos.',
    railCancel: 'Cancel',
    hitTheCorner: 'It hit the corner',
    celebrateStats: '{touches} hits · {visits} visits',
    successKicker: 'Payment received',
    successTitle: 'If the webhook landed, your mark is in.',
    successBody:
      'Fulfillment happens on the payment webhook, not this page. Beat the occupant and your logo bounces — every extra minute is another chance to hit a corner. If you did not take the slot, you still appear on the board. That charge is not refunded.',
    successCta: 'Watch it bounce',
    visitorsSinceLaunch: '{n} visitors since launch',
    seeStats: 'see stats',
    topBand: 'TOP {n}',
    rankingRowMeta: '{time} · {touches} hits · {visits} visits',
    touchCount: '{n} corner hits',
    peopleOnline: 'People online',
    statsLabel: 'Live board stats',
    statsWatching: 'watching',
    statsCorners: 'corners',
    statsClicks: 'clicks',
    statsBid: 'bid',
    statsWindow: 'last 24h',
    leaderboardEmptyTitle: 'Nobody has paid for the corner yet.',
    leaderboardEmptyBody:
      'The board fills from the top. Whoever goes first sets the price everyone after them has to beat.',
    leaderboardEmptyCta: 'Be the first',
    footerHouseTagline: 'Sells one bouncing logo. This row is what it has made.',
    footerLaunchedHours: 'launched {n}h ago',
    footerLaunchedDays: 'launched {n}d ago',
    footerHouseMeta: '{since} · {visits} visits',
    footerInspired: 'Inspired by outbid.lol by @jonathan_wilke',
    footerBuiltBy: 'Built by @{handle}',
    modalTitle: 'The occupant hit a corner',
    modalBody: 'Open {name} — we count a visit only when you go through.',
    modalCta: 'Visit {name}',
    modalDismiss: 'Keep watching',
    aboutTitle: 'About',
    aboutLead:
      'CornerBid sells one bouncing logo. Your mark is what hits the corners of this window. Time on the slot is the product.',
    aboutB1Title: 'Buy the bouncing logo',
    aboutB1:
      'Outbid the occupant and your product or @handle takes the screensaver. Physics keeps bouncing. Longer occupancy means more corner hits.',
    aboutB2Title: 'Raise to stay. Rank is dollars.',
    aboutB2:
      'Same URL or @handle pays only the difference. Paying less than the live occupant still lists you. The corner only belongs to whoever holds the slot.',
    aboutB3Title: 'Hits vs visits',
    aboutB3:
      'A hit is the physics event: the logo reached a corner. A visit is counted only when someone opens the occupant’s site from the corner modal.',
    rulesTitle: 'Rules',
    rulesIntro:
      'CornerBid is a public screensaver with one occupant. You pay so your logo is the one hitting the corners. Rank on the board is the bid. Value on the screen is time — and the corner hits that time produces.',
    rulesRankTitle: 'The bouncing logo',
    rulesRank1:
      'There is one live occupant. Their mark bounces across this window. Every time it hits a corner, that occupant scores a hit, and a modal offers their site to whoever is watching.',
    rulesRank2:
      'Taking the corner costs at least $1 more than the current occupant. Paying more buys occupancy, not faster physics. Stay longer and your logo has more chances to hit corners. There is no upper cap. Listings are whole dollars, $1 at a time.',
    rulesRank3:
      'Paying less still lists you on the ranking board at whatever place that bid can take. The screensaver still shows the occupant. Equal bids keep the order they were placed — the older listing stays higher.',
    rulesRank4:
      'Enter the same website or @handle again to raise. The new total must be at least $1 above what you already paid; you only pay the difference. That is how you keep the slot — and keep hitting corners. Tracking query strings are ignored. App Store, Play Store, GitHub, and similar platform links are keyed by path.',
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
      'A hit is recorded when the screensaver hits a corner. A visit is recorded only when someone goes through the corner modal to your URL or profile.',
    rulesAfter3: 'You warrant you have the rights to the mark you submit. Listings may be taken down.',
    rulesAfter4:
      'Checkout is Mercado Pago Checkout Pro. The bid is quoted in US dollars and charged in Argentine pesos at the rate frozen when you start payment.',
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
    fomoHeadline: 'Ahora mismo el logo que pega en la esquina es de otro.',
    fomoSub:
      'Veinte años esperando que el logo del DVD caiga justo en una esquina. Pagá más que él y la próxima es tuya.',
    claimFor: 'Tomá la esquina por',
    tagline:
      'Pagar más compra la ocupación: más tiempo, más toques de esquina. Pagar menos igual te lista. El screensaver solo muestra al ocupante.',
    amountHint: 'Dólares enteros, sin techo. Menos que la oferta más alta igual te mete en el ranking.',
    amountHintMore: 'Cómo funciona el precio',
    trending: 'Toques en tendencia',
    noTrending: 'No hay toques de esquina en la última hora.',
    activity: 'Actividad reciente',
    noActivity: 'Todavía no hay ofertas. La primera se lleva la esquina.',
    clicksPerHour: '{n} toques/h',
    justNow: 'ahora',
    minAgo: 'hace {n} min',
    hoursAgo: 'hace {n} h',
    rankingStats: '{touches} toques · {visits} visitas',
    holderStats: '{price} · {touches} toques · {visits} visitas',
    takeTheCorner: 'Tomá la esquina',
    amountLabel: 'Monto de la oferta en dólares',
    productPlaceholder: 'URL del producto o @handle',
    productLabel: 'URL del producto o @handle',
    raiseHint:
      '¿Ya ocupás o estás listado? Poné la misma URL o @handle y pagás solo la diferencia para quedarte más tiempo.',
    alreadyCommitted: 'Ya comprometiste {paid} · pagás {delta} más',
    redirecting: 'Redirigiendo…',
    takeCornerPay: 'Tomá la esquina · {price}',
    placeOnBoard: 'Listate en el ranking · {price}',
    priceMoved: 'El ocupante en vivo pasó a {price}. Revisá el nuevo monto y pagá de nuevo.',
    resolveFail: 'No pudimos leer ese link. Poné la URL de un producto o un @usuario de X.',
    checkoutFail: 'No se pudo abrir el pago. Revisá tu conexión y probá de nuevo.',
    close: 'Cerrar',
    lowerBid: 'Bajar oferta',
    raiseBid: 'Subir oferta',
    bidFineprint:
      'Si alguien paga más, conservás tu lugar en el ranking pero perdés la esquina. Ese cargo no se reintegra.',
    mpCredentialsMissing: 'Los pagos no están disponibles por ahora. Probá de nuevo en unos minutos.',
    paypalCredentialsMissing: 'PayPal no está disponible ahora. Pagá con Mercado Pago.',
    railModalTitle: '¿Cómo querés pagar?',
    railModalBody: 'Las dos cobran {price} por el mismo lugar.',
    railPayPal: 'Pagar con PayPal',
    railPayPalHint: 'Tarjeta o saldo de PayPal. Se cobra en dólares.',
    railMercadoPago: 'Pagar con Mercado Pago',
    railMercadoPagoHint: 'Tarjetas y transferencias de Argentina. Se cobra en pesos.',
    railCancel: 'Cancelar',
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
    touchCount: '{n} toques de esquina',
    peopleOnline: 'Personas en línea',
    statsLabel: 'Datos en vivo del tablero',
    statsWatching: 'mirando',
    statsCorners: 'esquinas',
    statsClicks: 'clics',
    statsBid: 'apostados',
    statsWindow: 'últimas 24 h',
    leaderboardEmptyTitle: 'Todavía nadie pagó por la esquina.',
    leaderboardEmptyBody:
      'El tablero se llena desde arriba. El que va primero le pone el precio a todos los que vengan después.',
    leaderboardEmptyCta: 'Sé el primero',
    footerHouseTagline: 'Vende un logo que rebota. Esta fila es lo que lleva ganado.',
    footerLaunchedHours: 'lanzado hace {n} h',
    footerLaunchedDays: 'lanzado hace {n} d',
    footerHouseMeta: '{since} · {visits} visitas',
    footerInspired: 'Inspirado en outbid.lol de @jonathan_wilke',
    footerBuiltBy: 'Hecho por @{handle}',
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
    rulesAfter4:
      'El checkout es Mercado Pago Checkout Pro. La oferta se cotiza en dólares y se cobra en pesos argentinos al tipo de cambio congelado al iniciar el pago.',
  },
} as const;

export type MessageKey = keyof (typeof messages)['en'];

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

function localeFromTag(tag: string): Locale | null {
  const normalized = tag.split(';')[0]?.trim().toLowerCase().replaceAll('_', '-') ?? '';
  if (!normalized) return null;
  if (normalized === 'es' || normalized.startsWith('es-')) return 'es';
  return 'en';
}

/** First listed language: `es` / `es-*` → Spanish, otherwise English. */
export function localeFromLanguageList(list: readonly string[]): Locale {
  for (const entry of list) {
    const locale = localeFromTag(entry);
    if (locale) return locale;
  }
  return 'en';
}

export function localeFromNavigator(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const list = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  return localeFromLanguageList(list);
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header?.trim()) return 'en';
  const ranked = header
    .split(',')
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(';');
      let q = 1;
      for (const param of params) {
        const [key, value] = param.split('=');
        if (key?.trim() === 'q') q = Number(value);
      }
      return { tag: rawTag ?? '', q: Number.isFinite(q) ? q : 0 };
    })
    .filter((part) => part.tag.length > 0)
    .sort((a, b) => b.q - a.q);
  return localeFromLanguageList(ranked.map((part) => part.tag));
}
