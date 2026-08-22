export type Locale = 'en' | 'es';

/** Legacy cookie — never read. Cleared on the client so it cannot pin English. */
export const LOCALE_COOKIE = 'cornerbid-locale';

export const messages = {
  en: {
    metaTitle: 'CornerBid — most corner hits wins',
    metaDescription:
      'Be the logo that hits the corner most. Money only buys the right to play. Rank is permanent hits. A visit counts when someone opens your site from the corner modal.',
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
      'Pay $1 more than the occupant and your mark is the one that scores. Hits stay forever. Rank is not for sale.',
    claimFor: 'Take the corner for',
    tagline:
      'Money buys occupancy. Hits buy rank. Same speed for everyone — paying more does not bounce faster.',
    amountHint: 'Whole dollars. At least $1 above the occupant takes the slot.',
    amountHintMore: 'How the game works',
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
      'Already listed? Enter the same URL or @handle and pay only the difference to raise.',
    alreadyCommitted: 'Already committed {paid} · pay {delta} more',
    redirecting: 'Redirecting…',
    takeCornerPay: 'Take the corner · {price}',
    placeOnBoard: 'Raise your bid · {price}',
    priceMoved: 'The live occupant moved to {price}. Check the new amount and pay again.',
    resolveFail: 'Unable to read that link. Enter a product URL or an X @handle.',
    checkoutFail: 'Unable to start checkout. Check your connection and try again.',
    close: 'Close',
    lowerBid: 'Lower bid',
    raiseBid: 'Raise bid',
    bidFineprint:
      'Payments are not refunded, even if you do not take the slot. Hits you already scored stay on the board.',
    mpCredentialsMissing: 'Payments are unavailable right now. Try again in a few minutes.',
    polarCredentialsMissing: 'Card payments are unavailable right now. Pay with Mercado Pago instead.',
    railModalTitle: 'How do you want to pay?',
    railModalBody: 'Both charge {price} for the same slot.',
    railPolar: 'Pay with card',
    railPolarHint: 'International cards. Charged in US dollars.',
    railMercadoPago: 'Pay with Mercado Pago',
    railMercadoPagoHint: 'Argentine cards and transfers. Charged in pesos.',
    railCancel: 'Cancel',
    railRecommended: 'Recommended',
    railPolarHintAr: 'From Argentina, Mercado Pago is usually easier.',
    hitTheCorner: 'It hit the corner',
    celebrateStats: '{touches} hits · {visits} visits',
    successKicker: 'Payment received',
    successTitle: 'If the webhook landed, your mark is in.',
    successBody:
      'Fulfillment happens on the payment webhook, not this page. Beat the occupant and your logo bounces — every corner it hits is yours. Hits already scored stay if someone pays more. That charge is not refunded.',
    successCta: 'Watch it bounce',
    visitorsSinceLaunch: '{n} visitors since launch',
    seeStats: 'see stats',
    topBand: 'TOP {n}',
    rankingRowMeta: '{time} · bid {bid} · {visits} visits',
    touchCount: '{n} hits',
    rankingHitsLabel: 'hits',
    rankingVisitsLabel: 'visits',
    rankingVisitLabel: 'visit',
    rankingHitsAria: '{n} corner hits',
    rankingVisitsAria: '{n} site visits',
    occupyingNow: 'Occupying now',
    occupyingBid: '{status} · bid {bid}',
    listedBid: 'bid {bid}',
    boardSeason: 'Season {name}',
    boardAllTime: 'All time',
    peopleOnline: 'People online',
    statsLabel: 'Live board stats',
    statsCorners: 'corners',
    statsClicks: 'clicks',
    statsBid: 'bid',
    statsWindow: 'last 24h',
    leaderboardEmptyTitle: 'Nobody has scored a hit yet.',
    leaderboardEmptyBody:
      'The board ranks by corner hits, not dollars. Take the slot and start scoring.',
    leaderboardEmptySeasonTitle: 'No hits this season yet.',
    leaderboardEmptySeasonBody:
      'Season rank resets every 30 days. All-time hits stay. Take the corner and open the board.',
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
      'CornerBid is a public screensaver. The goal is to be the logo that hits the corner most. Money only buys the right to play.',
    aboutB1Title: 'Pay to occupy. Hits to rank.',
    aboutB1:
      'There is one live occupant. Pay at least $1 more than they did and your product or @handle takes the screensaver. Every corner it hits is a permanent point.',
    aboutB2Title: 'Rank is hits. Money is just the key.',
    aboutB2:
      'The board sorts by total corner hits, not by what you paid. Same URL or @handle pays only the difference to raise. Paying more does not bounce faster.',
    aboutB3Title: 'Hits vs visits',
    aboutB3:
      'A hit is the physics event: the logo reached a corner. A visit is counted only when someone opens the occupant’s site from the corner modal.',
    rulesTitle: 'Rules',
    rulesIntro:
      'Be the logo that hits the corner most. Rank is not for sale. Money only buys the right to play.',
    rulesRankTitle: 'The board',
    rulesRank1: 'The board is ordered by lifetime corner hits. Whoever has the most is #1.',
    rulesRank2: 'Hits add up permanently. They do not reset when you lose the slot.',
    rulesRank3: 'If two listings have the same hits, the one that reached that count first ranks higher.',
    rulesRank4:
      'Each row also shows that listing’s current bid, so you can see what it costs to take the occupant out.',
    rulesOccupyTitle: 'How to be the bouncing logo',
    rulesOccupy1: 'Only one logo is on screen at a time.',
    rulesOccupy2:
      'To take the slot, pay at least $1 more than the current occupant. Confirmed payment makes you the occupant automatically.',
    rulesOccupy3: 'While you occupy, every corner hit adds 1 to your total.',
    rulesOccupy4:
      'Stay as long as you want. You lose the slot only when someone pays more. Hits you already scored stay.',
    rulesPayTitle: 'Payments',
    rulesPay1: 'Bids are whole US dollars, at least $1 above the occupant.',
    rulesPay2: 'If you are already listed, you only pay the difference to raise your bid.',
    rulesPay3: 'Every payment is final, even if you do not take the slot.',
    rulesPay4:
      'Checkout is Mercado Pago Checkout Pro. The bid is quoted in US dollars and charged in Argentine pesos at the rate of the moment.',
    rulesPay5: 'You may list the same URL or @handle again to keep adding hits.',
    rulesHitsTitle: 'Hits and visits',
    rulesHits1: 'A hit counts only when the logo actually reaches one of the four corners.',
    rulesHits2:
      'A corner hit opens a modal with the occupant’s link or @handle. A visit counts only when someone goes through that modal.',
    rulesListTitle: 'What you can list',
    rulesList1: 'A product website, or an X @handle.',
    rulesList2:
      'Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger, Signal, and similar.',
    rulesList3: 'Links to sexual content are not allowed.',
    rulesList4: 'Query parameters are stripped. Tracking and affiliate URLs will not keep those parameters.',
    rulesList5: 'Link shorteners are not allowed.',
    rulesAfterTitle: 'Other conditions',
    rulesAfter1: 'Physics is the same for everyone. Paying more does not bounce faster.',
    rulesAfter2: 'A 30-day season board runs beside all-time. Season hits reset; lifetime hits do not.',
    rulesAfter3: 'You warrant you have the rights to the mark you submit. Listings may be taken down.',
    rulesAfter4: 'The board updates in real time.',
  },
  es: {
    metaTitle: 'CornerBid — gana quien más pega en la esquina',
    metaDescription:
      'Sé el logo que más veces pega en la esquina. La plata solo compra el derecho a jugar. El ranking son hits permanentes. Una visita cuenta cuando alguien abre tu sitio desde el modal.',
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
      'Pagá $1 más que el ocupante y tu marca es la que suma. Los hits quedan para siempre. El ranking no se compra.',
    claimFor: 'Tomá la esquina por',
    tagline:
      'La plata compra la ocupación. Los hits compran el ranking. Misma velocidad para todos: pagar más no rebota más rápido.',
    amountHint: 'Dólares enteros. Al menos $1 más que el ocupante te lleva el slot.',
    amountHintMore: 'Cómo funciona el juego',
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
      '¿Ya estás listado? Poné la misma URL o @handle y pagás solo la diferencia para subir.',
    alreadyCommitted: 'Ya comprometiste {paid} · pagás {delta} más',
    redirecting: 'Redirigiendo…',
    takeCornerPay: 'Tomá la esquina · {price}',
    placeOnBoard: 'Subí tu puja · {price}',
    priceMoved: 'El ocupante en vivo pasó a {price}. Revisá el nuevo monto y pagá de nuevo.',
    resolveFail: 'No pudimos leer ese link. Poné la URL de un producto o un @usuario de X.',
    checkoutFail: 'No se pudo abrir el pago. Revisá tu conexión y probá de nuevo.',
    close: 'Cerrar',
    lowerBid: 'Bajar oferta',
    raiseBid: 'Subir oferta',
    bidFineprint:
      'Los pagos no se reintegran, aunque no tomes el slot. Los hits que ya sumaste se quedan en el ranking.',
    mpCredentialsMissing: 'Los pagos no están disponibles por ahora. Probá de nuevo en unos minutos.',
    polarCredentialsMissing: 'El pago con tarjeta no está disponible ahora. Pagá con Mercado Pago.',
    railModalTitle: '¿Cómo querés pagar?',
    railModalBody: 'Las dos cobran {price} por el mismo lugar.',
    railPolar: 'Pagar con tarjeta',
    railPolarHint: 'Tarjetas internacionales. Se cobra en dólares.',
    railMercadoPago: 'Pagar con Mercado Pago',
    railMercadoPagoHint: 'Tarjetas y transferencias de Argentina. Se cobra en pesos.',
    railCancel: 'Cancelar',
    railRecommended: 'Recomendado',
    railPolarHintAr: 'Desde Argentina, Mercado Pago suele ser más fácil.',
    hitTheCorner: 'Pegó en la esquina',
    celebrateStats: '{touches} toques · {visits} visitas',
    successKicker: 'Pago recibido',
    successTitle: 'Si el webhook llegó, tu marca ya está.',
    successBody:
      'La confirmación la hace el webhook, no esta página. Si le ganás al ocupante, tu logo rebota: cada esquina que pega es tuya. Si alguien paga más, los hits ya sumados se quedan. Ese cargo no se reintegra.',
    successCta: 'Ver el rebote',
    visitorsSinceLaunch: '{n} visitantes desde el lanzamiento',
    seeStats: 'ver stats',
    topBand: 'TOP {n}',
    rankingRowMeta: '{time} · puja {bid} · {visits} visitas',
    touchCount: '{n} hits',
    rankingHitsLabel: 'hits',
    rankingVisitsLabel: 'visitas',
    rankingVisitLabel: 'visita',
    rankingHitsAria: '{n} hits de esquina',
    rankingVisitsAria: '{n} visitas al sitio',
    occupyingNow: 'Ocupando ahora',
    occupyingBid: '{status} · puja {bid}',
    listedBid: 'puja {bid}',
    boardSeason: 'Temporada {name}',
    boardAllTime: 'Histórico',
    peopleOnline: 'Personas en línea',
    statsLabel: 'Datos en vivo del tablero',
    statsCorners: 'esquinas',
    statsClicks: 'clics',
    statsBid: 'apostados',
    statsWindow: 'últimas 24 h',
    leaderboardEmptyTitle: 'Todavía nadie sumó un hit.',
    leaderboardEmptyBody:
      'El ranking es por toques de esquina, no por plata. Tomá el slot y empezá a sumar.',
    leaderboardEmptySeasonTitle: 'Todavía no hay hits en esta temporada.',
    leaderboardEmptySeasonBody:
      'El ranking de temporada se reinicia cada 30 días. El histórico no. Tomá la esquina y abrí el tablero.',
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
      'CornerBid es un screensaver público. El objetivo es ser el logo que más veces pega en la esquina. La plata solo compra el derecho a jugar.',
    aboutB1Title: 'Pagás para ocupar. Los hits dan el ranking.',
    aboutB1:
      'Hay un solo ocupante. Pagá al menos $1 más que él y tu producto o @handle toma el screensaver. Cada esquina que pega es un punto permanente.',
    aboutB2Title: 'El ranking son hits. La plata es la llave.',
    aboutB2:
      'El tablero se ordena por toques de esquina, no por lo pagado. La misma URL o @handle paga solo la diferencia para subir. Pagar más no rebota más rápido.',
    aboutB3Title: 'Hits vs visitas',
    aboutB3:
      'Un hit es el evento de física: el logo llegó a una esquina. Una visita se cuenta solo cuando alguien abre el sitio del ocupante desde el modal.',
    rulesTitle: 'Reglas',
    rulesIntro:
      'Sé el logo que más veces pega en la esquina. El ranking no se compra. La plata solo te compra el derecho a jugar.',
    rulesRankTitle: 'El ranking principal',
    rulesRank1: 'El ranking se ordena por hits de esquina acumulados. Quien más tenga es el #1.',
    rulesRank2: 'Los hits se suman para siempre. No se resetean cuando perdés el slot.',
    rulesRank3: 'Si dos fichas tienen la misma cantidad, gana la que llegó primero a ese número.',
    rulesRank4:
      'Cada fila también muestra la puja actual, para ver cuánto hay que pagar para sacar al ocupante.',
    rulesOccupyTitle: 'Cómo ser el logo que rebota',
    rulesOccupy1: 'Solo hay un logo activo a la vez.',
    rulesOccupy2:
      'Para tomar el slot hay que pagar al menos $1 más que el ocupante. El pago confirmado te convierte en ocupante al toque.',
    rulesOccupy3: 'Mientras ocupás, cada esquina que pega suma 1 a tu total.',
    rulesOccupy4:
      'Podés quedarte todo el tiempo que quieras. Solo te sacan cuando alguien paga más. Los hits ya sumados se quedan.',
    rulesPayTitle: 'Pagos',
    rulesPay1: 'Las pujas son en dólares enteros, al menos $1 más que el ocupante.',
    rulesPay2: 'Si ya estás listado, solo pagás la diferencia para subir tu puja.',
    rulesPay3: 'Todo pago es final, aunque no llegues a ser el logo principal.',
    rulesPay4:
      'El checkout es Mercado Pago Checkout Pro. La oferta se cotiza en dólares y se cobra en pesos argentinos al tipo de cambio del momento.',
    rulesPay5: 'Podés volver a listar la misma URL o @handle para seguir sumando hits.',
    rulesHitsTitle: 'Hits y visitas',
    rulesHits1: 'Un hit cuenta solo cuando el logo pega de verdad en una de las cuatro esquinas.',
    rulesHits2:
      'Al pegar se abre un modal con el link o @handle del ocupante. Una visita cuenta solo cuando alguien entra por ese modal.',
    rulesListTitle: 'Qué podés listar',
    rulesList1: 'Un sitio de producto, o un @handle de X.',
    rulesList2:
      'No se permiten links de chat o invitaciones — Telegram, WhatsApp, Discord, Messenger, Signal y similares.',
    rulesList3: 'No se permite contenido sexual.',
    rulesList4: 'Se recortan los query params. URLs de tracking o afiliados no los conservan.',
    rulesList5: 'No se permiten acortadores de links.',
    rulesAfterTitle: 'Otras condiciones',
    rulesAfter1: 'La física es la misma para todos. Pagar más no rebota más rápido.',
    rulesAfter2: 'Hay un ranking de temporada de 30 días al lado del histórico. La temporada se reinicia; el histórico no.',
    rulesAfter3: 'Declarás derechos sobre la marca. Las fichas se pueden bajar.',
    rulesAfter4: 'El ranking se actualiza en tiempo real.',
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
