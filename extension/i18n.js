// Internationalization (i18n) for MSG Extension
class I18n {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {
      en: {
        // Popup
        'popup_title': 'MSG: Chat with Any Websites',
        'enter_api_key': 'Enter your Gemini API Key',
        'api_key_secure': 'Your key stays secure on your device and is never shared.',
        'api_key_placeholder': 'Paste your Gemini API key here',
        'save_key': 'Save Key',
        'get_api_key': '🔑 Get your API key from AI Studio',
        'signin_google': 'Sign in with Google for additional features (optional):',
        'signin_button': 'Sign in with Google',
        'signed_in_as': 'Signed in as',
        'sign_out': 'Sign Out',
        'quick_settings': 'Quick Settings',
        'dark_mode': 'Dark mode',
        'transparent_bg': 'Semi-transparent background',
        'panel_width': 'Panel Width',
        'panel_narrow': 'Narrow',
        'panel_medium': 'Medium',
        'panel_wide': 'Wide',
        'auto_summarize': 'Auto-suggest summary',
        'language': 'Language',
        'save_settings': 'Save Settings',
        'shortcut_info': 'Press / twice quickly to open MSG on any website',
        'advanced_settings': 'Advanced Settings',
        
        // Options
        'options_title': 'MSG Settings',
        'api_key_section': 'API Key',
        'gemini_api_key': 'Gemini API Key',
        'api_key_secure_server': 'Your key stays secure on your device and is never shared with any server.',
        'save_api_key': 'Save API Key',
        'account_section': 'Account',
        'not_signed_in': 'You are not signed in.',
        'appearance_section': 'Appearance',
        'use_dark_mode': 'Use dark mode (otherwise follows system setting)',
        'use_transparent_bg': 'Use semi-transparent background',
        'behavior_section': 'Behavior',
        'panel_width_narrow': 'Narrow (300px)',
        'panel_width_medium': 'Medium (380px)',
        'panel_width_wide': 'Wide (450px)',
        'auto_summarize_full': 'Automatically suggest a summary when panel opens',
        'enable_grounding': 'Enable Google Grounding (makes responses more accurate by searching the web)',
        'grounding_when': 'When to use grounding:',
        'grounding_auto': 'Automatic (when needed)',
        'grounding_always': 'Always',
        'grounding_explicit': 'Only when user asks',
        'keyboard_shortcut': 'Keyboard Shortcut',
        'shortcut_description': 'Open/close MSG panel: Press / twice quickly',
        'save_all_settings': 'Save All Settings',
        
        // Status messages
        'api_key_saved': 'API key saved successfully!',
        'settings_saved': 'Settings saved successfully!',
        'signin_successful': 'Signed in successfully',
        'signout_successful': 'Signed out successfully',
        'api_key_set': 'API key is set',
        'invalid_api_key': 'Please enter a valid API key',
        'signin_failed': 'Sign in failed',
        'signout_failed': 'Logout error',
        
        // Content script messages
        'chat_title': 'MSG Chat',
        'ask_placeholder': 'Ask anything about this page...',
        'welcome_message': 'Hi there! I\'m MSG, your website assistant. I\'ve analyzed this page and can help you understand its content with intelligent search.',
        'grounding_enabled_all': 'Web search is enabled for all queries.',
        'grounding_enabled_auto': 'Web search will be used automatically when needed.',
        'grounding_enabled_explicit': 'Web search is available when you explicitly ask for it (e.g., "search for...")',
        'content_loaded': 'Content loaded ({size}KB). {grounding} Type "summarize" for a quick overview.',
        'content_loaded_simple': 'Content loaded ({size}KB). Type "summarize" for a quick overview.',
        'web_search_indicator': 'Web Search',
        'api_key_error': 'Error: Please check your API key in settings.'
      },
      
      es: {
        // Popup
        'popup_title': 'MSG: Chatea con Cualquier Sitio Web',
        'enter_api_key': 'Ingresa tu Clave API de Gemini',
        'api_key_secure': 'Tu clave permanece segura en tu dispositivo y nunca se comparte.',
        'api_key_placeholder': 'Pega tu clave API de Gemini aquí',
        'save_key': 'Guardar Clave',
        'get_api_key': '🔑 Obtén tu clave API desde AI Studio',
        'signin_google': 'Inicia sesión con Google para funciones adicionales (opcional):',
        'signin_button': 'Iniciar sesión con Google',
        'signed_in_as': 'Conectado como',
        'sign_out': 'Cerrar Sesión',
        'quick_settings': 'Configuración Rápida',
        'dark_mode': 'Modo oscuro',
        'transparent_bg': 'Fondo semi-transparente',
        'panel_width': 'Ancho del Panel',
        'panel_narrow': 'Estrecho',
        'panel_medium': 'Mediano',
        'panel_wide': 'Ancho',
        'auto_summarize': 'Sugerir resumen automáticamente',
        'language': 'Idioma',
        'save_settings': 'Guardar Configuración',
        'shortcut_info': 'Presiona / dos veces rápidamente para abrir MSG en cualquier sitio web',
        'advanced_settings': 'Configuración Avanzada',
        
        // Options
        'options_title': 'Configuración de MSG',
        'api_key_section': 'Clave API',
        'gemini_api_key': 'Clave API de Gemini',
        'api_key_secure_server': 'Tu clave permanece segura en tu dispositivo y nunca se comparte con ningún servidor.',
        'save_api_key': 'Guardar Clave API',
        'account_section': 'Cuenta',
        'not_signed_in': 'No has iniciado sesión.',
        'appearance_section': 'Apariencia',
        'use_dark_mode': 'Usar modo oscuro (de lo contrario sigue la configuración del sistema)',
        'use_transparent_bg': 'Usar fondo semi-transparente',
        'behavior_section': 'Comportamiento',
        'panel_width_narrow': 'Estrecho (300px)',
        'panel_width_medium': 'Mediano (380px)',
        'panel_width_wide': 'Ancho (450px)',
        'auto_summarize_full': 'Sugerir automáticamente un resumen cuando se abra el panel',
        'enable_grounding': 'Habilitar Google Grounding (hace las respuestas más precisas buscando en la web)',
        'grounding_when': 'Cuándo usar grounding:',
        'grounding_auto': 'Automático (cuando sea necesario)',
        'grounding_always': 'Siempre',
        'grounding_explicit': 'Solo cuando el usuario lo pida',
        'keyboard_shortcut': 'Atajo de Teclado',
        'shortcut_description': 'Abrir/cerrar panel MSG: Presiona / dos veces rápidamente',
        'save_all_settings': 'Guardar Toda la Configuración',
        
        // Status messages
        'api_key_saved': '¡Clave API guardada exitosamente!',
        'settings_saved': '¡Configuración guardada exitosamente!',
        'signin_successful': 'Inicio de sesión exitoso',
        'signout_successful': 'Cierre de sesión exitoso',
        'api_key_set': 'Clave API configurada',
        'invalid_api_key': 'Por favor ingresa una clave API válida',
        'signin_failed': 'Error al iniciar sesión',
        'signout_failed': 'Error al cerrar sesión',
        
        // Content script messages
        'chat_title': 'MSG Chat',
        'ask_placeholder': 'Pregunta cualquier cosa sobre esta página...',
        'welcome_message': '¡Hola! Soy MSG, tu asistente web. He analizado esta página y puedo ayudarte a entender su contenido con búsqueda inteligente.',
        'grounding_enabled_all': 'La búsqueda web está habilitada para todas las consultas.',
        'grounding_enabled_auto': 'La búsqueda web se usará automáticamente cuando sea necesario.',
        'grounding_enabled_explicit': 'La búsqueda web está disponible cuando la solicites explícitamente (ej: "buscar...").',
        'content_loaded': 'Contenido cargado ({size}KB). {grounding} Escribe "resumir" para una vista rápida.',
        'content_loaded_simple': 'Contenido cargado ({size}KB). Escribe "resumir" para una vista rápida.',
        'web_search_indicator': 'Búsqueda Web',
        'api_key_error': 'Error: Por favor verifica tu clave API en configuración.'
      },
      
      fr: {
        // Popup
        'popup_title': 'MSG: Chattez avec N\'importe Quel Site Web',
        'enter_api_key': 'Entrez votre Clé API Gemini',
        'api_key_secure': 'Votre clé reste sécurisée sur votre appareil et n\'est jamais partagée.',
        'api_key_placeholder': 'Collez votre clé API Gemini ici',
        'save_key': 'Sauvegarder la Clé',
        'get_api_key': '🔑 Obtenez votre clé API depuis AI Studio',
        'signin_google': 'Connectez-vous avec Google pour des fonctionnalités supplémentaires (optionnel):',
        'signin_button': 'Se connecter avec Google',
        'signed_in_as': 'Connecté en tant que',
        'sign_out': 'Se Déconnecter',
        'quick_settings': 'Paramètres Rapides',
        'dark_mode': 'Mode sombre',
        'transparent_bg': 'Arrière-plan semi-transparent',
        'panel_width': 'Largeur du Panneau',
        'panel_narrow': 'Étroit',
        'panel_medium': 'Moyen',
        'panel_wide': 'Large',
        'auto_summarize': 'Suggérer automatiquement un résumé',
        'language': 'Langue',
        'save_settings': 'Sauvegarder les Paramètres',
        'shortcut_info': 'Appuyez sur / deux fois rapidement pour ouvrir MSG sur n\'importe quel site web',
        'advanced_settings': 'Paramètres Avancés',
        
        // Options  
        'options_title': 'Paramètres MSG',
        'api_key_section': 'Clé API',
        'gemini_api_key': 'Clé API Gemini',
        'api_key_secure_server': 'Votre clé reste sécurisée sur votre appareil et n\'est jamais partagée avec aucun serveur.',
        'save_api_key': 'Sauvegarder la Clé API',
        'account_section': 'Compte',
        'not_signed_in': 'Vous n\'êtes pas connecté.',
        'appearance_section': 'Apparence',
        'use_dark_mode': 'Utiliser le mode sombre (sinon suit les paramètres système)',
        'use_transparent_bg': 'Utiliser un arrière-plan semi-transparent',
        'behavior_section': 'Comportement',
        'panel_width_narrow': 'Étroit (300px)',
        'panel_width_medium': 'Moyen (380px)',
        'panel_width_wide': 'Large (450px)',
        'auto_summarize_full': 'Suggérer automatiquement un résumé à l\'ouverture du panneau',
        'enable_grounding': 'Activer Google Grounding (rend les réponses plus précises en recherchant sur le web)',
        'grounding_when': 'Quand utiliser le grounding:',
        'grounding_auto': 'Automatique (quand nécessaire)',
        'grounding_always': 'Toujours',
        'grounding_explicit': 'Seulement quand l\'utilisateur le demande',
        'keyboard_shortcut': 'Raccourci Clavier',
        'shortcut_description': 'Ouvrir/fermer le panneau MSG: Appuyez sur / deux fois rapidement',
        'save_all_settings': 'Sauvegarder Tous les Paramètres',
        
        // Status messages
        'api_key_saved': 'Clé API sauvegardée avec succès!',
        'settings_saved': 'Paramètres sauvegardés avec succès!',
        'signin_successful': 'Connexion réussie',
        'signout_successful': 'Déconnexion réussie',
        'api_key_set': 'Clé API configurée',
        'invalid_api_key': 'Veuillez entrer une clé API valide',
        'signin_failed': 'Échec de la connexion',
        'signout_failed': 'Erreur de déconnexion',
        
        // Content script messages
        'chat_title': 'MSG Chat',
        'ask_placeholder': 'Demandez tout sur cette page...',
        'welcome_message': 'Salut! Je suis MSG, votre assistant web. J\'ai analysé cette page et peux vous aider à comprendre son contenu avec une recherche intelligente.',
        'grounding_enabled_all': 'La recherche web est activée pour toutes les requêtes.',
        'grounding_enabled_auto': 'La recherche web sera utilisée automatiquement quand nécessaire.',
        'grounding_enabled_explicit': 'La recherche web est disponible quand vous la demandez explicitement (ex: "rechercher...").',
        'content_loaded': 'Contenu chargé ({size}KB). {grounding} Tapez "résumer" pour un aperçu rapide.',
        'content_loaded_simple': 'Contenu chargé ({size}KB). Tapez "résumer" pour un aperçu rapide.',
        'web_search_indicator': 'Recherche Web',
        'api_key_error': 'Erreur: Veuillez vérifier votre clé API dans les paramètres.'
      },
      
      de: {
        // Popup
        'popup_title': 'MSG: Chatten Sie mit Beliebigen Webseiten',
        'enter_api_key': 'Geben Sie Ihren Gemini API-Schlüssel ein',
        'api_key_secure': 'Ihr Schlüssel bleibt sicher auf Ihrem Gerät und wird niemals geteilt.',
        'api_key_placeholder': 'Fügen Sie hier Ihren Gemini API-Schlüssel ein',
        'save_key': 'Schlüssel Speichern',
        'get_api_key': '🔑 Holen Sie sich Ihren API-Schlüssel von AI Studio',
        'signin_google': 'Mit Google anmelden für zusätzliche Funktionen (optional):',
        'signin_button': 'Mit Google anmelden',
        'signed_in_as': 'Angemeldet als',
        'sign_out': 'Abmelden',
        'quick_settings': 'Schnelleinstellungen',
        'dark_mode': 'Dunkler Modus',
        'transparent_bg': 'Halbtransparenter Hintergrund',
        'panel_width': 'Panel-Breite',
        'panel_narrow': 'Schmal',
        'panel_medium': 'Mittel',
        'panel_wide': 'Breit',
        'auto_summarize': 'Zusammenfassung automatisch vorschlagen',
        'language': 'Sprache',
        'save_settings': 'Einstellungen Speichern',
        'shortcut_info': 'Drücken Sie / zweimal schnell, um MSG auf jeder Webseite zu öffnen',
        'advanced_settings': 'Erweiterte Einstellungen',
        
        // Options
        'options_title': 'MSG Einstellungen',
        'api_key_section': 'API-Schlüssel',
        'gemini_api_key': 'Gemini API-Schlüssel',
        'api_key_secure_server': 'Ihr Schlüssel bleibt sicher auf Ihrem Gerät und wird niemals mit einem Server geteilt.',
        'save_api_key': 'API-Schlüssel Speichern',
        'account_section': 'Konto',
        'not_signed_in': 'Sie sind nicht angemeldet.',
        'appearance_section': 'Erscheinungsbild',
        'use_dark_mode': 'Dunklen Modus verwenden (ansonsten Systemeinstellung folgen)',
        'use_transparent_bg': 'Halbtransparenten Hintergrund verwenden',
        'behavior_section': 'Verhalten',
        'panel_width_narrow': 'Schmal (300px)',
        'panel_width_medium': 'Mittel (380px)',
        'panel_width_wide': 'Breit (450px)',
        'auto_summarize_full': 'Automatisch eine Zusammenfassung vorschlagen, wenn sich das Panel öffnet',
        'enable_grounding': 'Google Grounding aktivieren (macht Antworten durch Websuche genauer)',
        'grounding_when': 'Wann Grounding verwenden:',
        'grounding_auto': 'Automatisch (bei Bedarf)',
        'grounding_always': 'Immer',
        'grounding_explicit': 'Nur auf Benutzeranfrage',
        'keyboard_shortcut': 'Tastenkürzel',
        'shortcut_description': 'MSG-Panel öffnen/schließen: Drücken Sie / zweimal schnell',
        'save_all_settings': 'Alle Einstellungen Speichern',
        
        // Status messages
        'api_key_saved': 'API-Schlüssel erfolgreich gespeichert!',
        'settings_saved': 'Einstellungen erfolgreich gespeichert!',
        'signin_successful': 'Anmeldung erfolgreich',
        'signout_successful': 'Abmeldung erfolgreich',
        'api_key_set': 'API-Schlüssel ist gesetzt',
        'invalid_api_key': 'Bitte geben Sie einen gültigen API-Schlüssel ein',
        'signin_failed': 'Anmeldung fehlgeschlagen',
        'signout_failed': 'Abmelde-Fehler',
        
        // Content script messages
        'chat_title': 'MSG Chat',
        'ask_placeholder': 'Fragen Sie alles über diese Seite...',
        'welcome_message': 'Hallo! Ich bin MSG, Ihr Web-Assistent. Ich habe diese Seite analysiert und kann Ihnen helfen, ihren Inhalt mit intelligenter Suche zu verstehen.',
        'grounding_enabled_all': 'Websuche ist für alle Anfragen aktiviert.',
        'grounding_enabled_auto': 'Websuche wird automatisch bei Bedarf verwendet.',
        'grounding_enabled_explicit': 'Websuche ist verfügbar, wenn Sie explizit danach fragen (z.B. "suche nach...").',
        'content_loaded': 'Inhalt geladen ({size}KB). {grounding} Tippen Sie "zusammenfassen" für eine schnelle Übersicht.',
        'content_loaded_simple': 'Inhalt geladen ({size}KB). Tippen Sie "zusammenfassen" für eine schnelle Übersicht.',
        'web_search_indicator': 'Websuche',
        'api_key_error': 'Fehler: Bitte überprüfen Sie Ihren API-Schlüssel in den Einstellungen.'
      },
      
      zh: {
        // Popup
        'popup_title': 'MSG: 与任何网站聊天',
        'enter_api_key': '输入您的 Gemini API 密钥',
        'api_key_secure': '您的密钥安全保存在您的设备上，永远不会被分享。',
        'api_key_placeholder': '在此粘贴您的 Gemini API 密钥',
        'save_key': '保存密钥',
        'get_api_key': '🔑 从 AI Studio 获取您的 API 密钥',
        'signin_google': '使用 Google 登录以获得额外功能（可选）：',
        'signin_button': '使用 Google 登录',
        'signed_in_as': '已登录为',
        'sign_out': '登出',
        'quick_settings': '快速设置',
        'dark_mode': '深色模式',
        'transparent_bg': '半透明背景',
        'panel_width': '面板宽度',
        'panel_narrow': '窄',
        'panel_medium': '中等',
        'panel_wide': '宽',
        'auto_summarize': '自动建议摘要',
        'language': '语言',
        'save_settings': '保存设置',
        'shortcut_info': '快速按两次 / 键在任何网站上打开 MSG',
        'advanced_settings': '高级设置',
        
        // Options
        'options_title': 'MSG 设置',
        'api_key_section': 'API 密钥',
        'gemini_api_key': 'Gemini API 密钥',
        'api_key_secure_server': '您的密钥安全保存在您的设备上，永远不会与任何服务器共享。',
        'save_api_key': '保存 API 密钥',
        'account_section': '账户',
        'not_signed_in': '您尚未登录。',
        'appearance_section': '外观',
        'use_dark_mode': '使用深色模式（否则跟随系统设置）',
        'use_transparent_bg': '使用半透明背景',
        'behavior_section': '行为',
        'panel_width_narrow': '窄 (300px)',
        'panel_width_medium': '中等 (380px)',
        'panel_width_wide': '宽 (450px)',
        'auto_summarize_full': '面板打开时自动建议摘要',
        'enable_grounding': '启用 Google Grounding（通过网络搜索使回答更准确）',
        'grounding_when': '何时使用 grounding：',
        'grounding_auto': '自动（需要时）',
        'grounding_always': '总是',
        'grounding_explicit': '仅当用户要求时',
        'keyboard_shortcut': '键盘快捷键',
        'shortcut_description': '打开/关闭 MSG 面板：快速按两次 / 键',
        'save_all_settings': '保存所有设置',
        
        // Status messages
        'api_key_saved': 'API 密钥保存成功！',
        'settings_saved': '设置保存成功！',
        'signin_successful': '登录成功',
        'signout_successful': '登出成功',
        'api_key_set': 'API 密钥已设置',
        'invalid_api_key': '请输入有效的 API 密钥',
        'signin_failed': '登录失败',
        'signout_failed': '登出错误',
        
        // Content script messages
        'chat_title': 'MSG 聊天',
        'ask_placeholder': '询问关于这个页面的任何内容...',
        'welcome_message': '你好！我是 MSG，你的网站助手。我已经分析了这个页面，可以帮助你通过智能搜索理解其内容。',
        'grounding_enabled_all': '网络搜索已为所有查询启用。',
        'grounding_enabled_auto': '网络搜索将在需要时自动使用。',
        'grounding_enabled_explicit': '当你明确要求时（例如"搜索..."），网络搜索可用。',
        'content_loaded': '内容已加载（{size}KB）。{grounding} 输入"总结"获取快速概览。',
        'content_loaded_simple': '内容已加载（{size}KB）。输入"总结"获取快速概览。',
        'web_search_indicator': '网络搜索',
        'api_key_error': '错误：请检查设置中的 API 密钥。'
      },
      
      it: {
        // Popup
        'popup_title': 'MSG: Chatta con Qualsiasi Sito Web',
        'enter_api_key': 'Inserisci la tua Chiave API Gemini',
        'api_key_secure': 'La tua chiave rimane sicura sul tuo dispositivo e non viene mai condivisa.',
        'api_key_placeholder': 'Incolla qui la tua chiave API Gemini',
        'save_key': 'Salva Chiave',
        'get_api_key': '🔑 Ottieni la tua chiave API da AI Studio',
        'signin_google': 'Accedi con Google per funzionalità aggiuntive (opzionale):',
        'signin_button': 'Accedi con Google',
        'signed_in_as': 'Connesso come',
        'sign_out': 'Disconnetti',
        'quick_settings': 'Impostazioni Rapide',
        'dark_mode': 'Modalità scura',
        'transparent_bg': 'Sfondo semi-trasparente',
        'panel_width': 'Larghezza Pannello',
        'panel_narrow': 'Stretto',
        'panel_medium': 'Medio',
        'panel_wide': 'Largo',
        'auto_summarize': 'Suggerisci riassunto automaticamente',
        'language': 'Lingua',
        'save_settings': 'Salva Impostazioni',
        'shortcut_info': 'Premi / due volte rapidamente per aprire MSG su qualsiasi sito web',
        'advanced_settings': 'Impostazioni Avanzate',
        
        // Options
        'options_title': 'Impostazioni MSG',
        'api_key_section': 'Chiave API',
        'gemini_api_key': 'Chiave API Gemini',
        'api_key_secure_server': 'La tua chiave rimane sicura sul tuo dispositivo e non viene mai condivisa con nessun server.',
        'save_api_key': 'Salva Chiave API',
        'account_section': 'Account',
        'not_signed_in': 'Non sei connesso.',
        'appearance_section': 'Aspetto',
        'use_dark_mode': 'Usa modalità scura (altrimenti segue le impostazioni di sistema)',
        'use_transparent_bg': 'Usa sfondo semi-trasparente',
        'behavior_section': 'Comportamento',
        'panel_width_narrow': 'Stretto (300px)',
        'panel_width_medium': 'Medio (380px)',
        'panel_width_wide': 'Largo (450px)',
        'auto_summarize_full': 'Suggerisci automaticamente un riassunto quando si apre il pannello',
        'enable_grounding': 'Abilita Google Grounding (rende le risposte più accurate cercando sul web)',
        'grounding_when': 'Quando usare il grounding:',
        'grounding_auto': 'Automatico (quando necessario)',
        'grounding_always': 'Sempre',
        'grounding_explicit': 'Solo quando richiesto dall\'utente',
        'keyboard_shortcut': 'Scorciatoia da Tastiera',
        'shortcut_description': 'Apri/chiudi pannello MSG: Premi / due volte rapidamente',
        'save_all_settings': 'Salva Tutte le Impostazioni',
        
        // Status messages
        'api_key_saved': 'Chiave API salvata con successo!',
        'settings_saved': 'Impostazioni salvate con successo!',
        'signin_successful': 'Accesso riuscito',
        'signout_successful': 'Disconnessione riuscita',
        'api_key_set': 'Chiave API impostata',
        'invalid_api_key': 'Inserisci una chiave API valida',
        'signin_failed': 'Accesso fallito',
        'signout_failed': 'Errore di disconnessione',
        
        // Content script messages
        'chat_title': 'MSG Chat',
        'ask_placeholder': 'Chiedi qualsiasi cosa su questa pagina...',
        'welcome_message': 'Ciao! Sono MSG, il tuo assistente web. Ho analizzato questa pagina e posso aiutarti a comprenderne il contenuto con ricerca intelligente.',
        'grounding_enabled_all': 'La ricerca web è abilitata per tutte le query.',
        'grounding_enabled_auto': 'La ricerca web sarà utilizzata automaticamente quando necessario.',
        'grounding_enabled_explicit': 'La ricerca web è disponibile quando la richiedi esplicitamente (es: "cerca...").',
        'content_loaded': 'Contenuto caricato ({size}KB). {grounding} Digita "riassumi" per una panoramica rapida.',
        'content_loaded_simple': 'Contenuto caricato ({size}KB). Digita "riassumi" per una panoramica rapida.',
        'web_search_indicator': 'Ricerca Web',
        'api_key_error': 'Errore: Controlla la tua chiave API nelle impostazioni.'
      },
      
      pt: {
        // Popup
        'popup_title': 'MSG: Converse com Qualquer Site',
        'enter_api_key': 'Digite sua Chave API do Gemini',
        'api_key_secure': 'Sua chave permanece segura em seu dispositivo e nunca é compartilhada.',
        'api_key_placeholder': 'Cole sua chave API do Gemini aqui',
        'save_key': 'Salvar Chave',
        'get_api_key': '🔑 Obtenha sua chave API do AI Studio',
        'signin_google': 'Entre com Google para recursos adicionais (opcional):',
        'signin_button': 'Entrar com Google',
        'signed_in_as': 'Conectado como',
        'sign_out': 'Sair',
        'quick_settings': 'Configurações Rápidas',
        'dark_mode': 'Modo escuro',
        'transparent_bg': 'Fundo semi-transparente',
        'panel_width': 'Largura do Painel',
        'panel_narrow': 'Estreito',
        'panel_medium': 'Médio',
        'panel_wide': 'Largo',
        'auto_summarize': 'Sugerir resumo automaticamente',
        'language': 'Idioma',
        'save_settings': 'Salvar Configurações',
        'shortcut_info': 'Pressione / duas vezes rapidamente para abrir MSG em qualquer site',
        'advanced_settings': 'Configurações Avançadas',
        
        // Options
        'options_title': 'Configurações MSG',
        'api_key_section': 'Chave API',
        'gemini_api_key': 'Chave API do Gemini',
        'api_key_secure_server': 'Sua chave permanece segura em seu dispositivo e nunca é compartilhada com nenhum servidor.',
        'save_api_key': 'Salvar Chave API',
        'account_section': 'Conta',
        'not_signed_in': 'Você não está conectado.',
        'appearance_section': 'Aparência',
        'use_dark_mode': 'Usar modo escuro (caso contrário, segue as configurações do sistema)',
        'use_transparent_bg': 'Usar fundo semi-transparente',
        'behavior_section': 'Comportamento',
        'panel_width_narrow': 'Estreito (300px)',
        'panel_width_medium': 'Médio (380px)',
        'panel_width_wide': 'Largo (450px)',
        'auto_summarize_full': 'Sugerir automaticamente um resumo quando o painel abrir',
        'enable_grounding': 'Habilitar Google Grounding (torna as respostas mais precisas pesquisando na web)',
        'grounding_when': 'Quando usar grounding:',
        'grounding_auto': 'Automático (quando necessário)',
        'grounding_always': 'Sempre',
        'grounding_explicit': 'Apenas quando o usuário solicitar',
        'keyboard_shortcut': 'Atalho do Teclado',
        'shortcut_description': 'Abrir/fechar painel MSG: Pressione / duas vezes rapidamente',
        'save_all_settings': 'Salvar Todas as Configurações',
        
        // Status messages
        'api_key_saved': 'Chave API salva com sucesso!',
        'settings_saved': 'Configurações salvas com sucesso!',
        'signin_successful': 'Login realizado com sucesso',
        'signout_successful': 'Logout realizado com sucesso',
        'api_key_set': 'Chave API configurada',
        'invalid_api_key': 'Por favor, digite uma chave API válida',
        'signin_failed': 'Falha no login',
        'signout_failed': 'Erro no logout',
        
        // Content script messages
        'chat_title': 'MSG Chat',
        'ask_placeholder': 'Pergunte qualquer coisa sobre esta página...',
        'welcome_message': 'Olá! Eu sou MSG, seu assistente web. Analisei esta página e posso ajudá-lo a entender seu conteúdo com busca inteligente.',
        'grounding_enabled_all': 'A busca na web está habilitada para todas as consultas.',
        'grounding_enabled_auto': 'A busca na web será usada automaticamente quando necessário.',
        'grounding_enabled_explicit': 'A busca na web está disponível quando você solicita explicitamente (ex: "pesquisar...").',
        'content_loaded': 'Conteúdo carregado ({size}KB). {grounding} Digite "resumir" para uma visão geral rápida.',
        'content_loaded_simple': 'Conteúdo carregado ({size}KB). Digite "resumir" para uma visão geral rápida.',
        'web_search_indicator': 'Busca Web',
        'api_key_error': 'Erro: Verifique sua chave API nas configurações.'
      },
      
      ja: {
        // Popup
        'popup_title': 'MSG: あらゆるウェブサイトとチャット',
        'enter_api_key': 'Gemini APIキーを入力',
        'api_key_secure': 'あなたのキーは安全にデバイスに保存され、共有されることはありません。',
        'api_key_placeholder': 'Gemini APIキーをここに貼り付けてください',
        'save_key': 'キーを保存',
        'get_api_key': '🔑 AI StudioでAPIキーを取得',
        'signin_google': '追加機能のためGoogleでサインイン（オプション）:',
        'signin_button': 'Googleでサインイン',
        'signed_in_as': 'サインイン中:',
        'sign_out': 'サインアウト',
        'quick_settings': 'クイック設定',
        'dark_mode': 'ダークモード',
        'transparent_bg': '半透明背景',
        'panel_width': 'パネル幅',
        'panel_narrow': '狭い',
        'panel_medium': '中',
        'panel_wide': '広い',
        'auto_summarize': '要約の自動提案',
        'language': '言語',
        'save_settings': '設定を保存',
        'shortcut_info': '任意のウェブサイトでMSGを開くには / を2回素早く押してください',
        'advanced_settings': '詳細設定',
        
        // Options
        'options_title': 'MSG設定',
        'api_key_section': 'APIキー',
        'gemini_api_key': 'Gemini APIキー',
        'api_key_secure_server': 'あなたのキーは安全にデバイスに保存され、どのサーバーとも共有されることはありません。',
        'save_api_key': 'APIキーを保存',
        'account_section': 'アカウント',
        'not_signed_in': 'サインインしていません。',
        'appearance_section': '外観',
        'use_dark_mode': 'ダークモードを使用（それ以外はシステム設定に従う）',
        'use_transparent_bg': '半透明背景を使用',
        'behavior_section': '動作',
        'panel_width_narrow': '狭い (300px)',
        'panel_width_medium': '中 (380px)',
        'panel_width_wide': '広い (450px)',
        'auto_summarize_full': 'パネルが開いたときに自動的に要約を提案',
        'enable_grounding': 'Google Groundingを有効化（Web検索により回答をより正確にします）',
        'grounding_when': 'Groundingを使用するタイミング:',
        'grounding_auto': '自動（必要時）',
        'grounding_always': '常に',
        'grounding_explicit': 'ユーザーが要求した時のみ',
        'keyboard_shortcut': 'キーボードショートカット',
        'shortcut_description': 'MSGパネルを開く/閉じる: / を2回素早く押す',
        'save_all_settings': 'すべての設定を保存',
        
        // Status messages
        'api_key_saved': 'APIキーが正常に保存されました！',
        'settings_saved': '設定が正常に保存されました！',
        'signin_successful': 'サインインに成功しました',
        'signout_successful': 'サインアウトに成功しました',
        'api_key_set': 'APIキーが設定されました',
        'invalid_api_key': '有効なAPIキーを入力してください',
        'signin_failed': 'サインインに失敗しました',
        'signout_failed': 'サインアウトエラー',
        
        // Content script messages
        'chat_title': 'MSG チャット',
        'ask_placeholder': 'このページについて何でも質問してください...',
        'welcome_message': 'こんにちは！私はMSG、あなたのWebアシスタントです。このページを分析し、インテリジェント検索でコンテンツの理解をお手伝いできます。',
        'grounding_enabled_all': 'すべてのクエリでWeb検索が有効になっています。',
        'grounding_enabled_auto': '必要に応じてWeb検索が自動的に使用されます。',
        'grounding_enabled_explicit': '明示的に要求した場合（例：「検索...」）にWeb検索が利用可能です。',
        'content_loaded': 'コンテンツを読み込みました（{size}KB）。{grounding} 「要約」と入力すると概要を表示します。',
        'content_loaded_simple': 'コンテンツを読み込みました（{size}KB）。「要約」と入力すると概要を表示します。',
        'web_search_indicator': 'Web検索',
        'api_key_error': 'エラー: 設定でAPIキーを確認してください。'
      },
      
      ko: {
        // Popup
        'popup_title': 'MSG: 모든 웹사이트와 채팅',
        'enter_api_key': 'Gemini API 키 입력',
        'api_key_secure': '키는 기기에 안전하게 저장되며 공유되지 않습니다.',
        'api_key_placeholder': 'Gemini API 키를 여기에 붙여넣으세요',
        'save_key': '키 저장',
        'get_api_key': '🔑 AI Studio에서 API 키 받기',
        'signin_google': '추가 기능을 위해 Google로 로그인 (선택사항):',
        'signin_button': 'Google로 로그인',
        'signed_in_as': '로그인됨:',
        'sign_out': '로그아웃',
        'quick_settings': '빠른 설정',
        'dark_mode': '다크 모드',
        'transparent_bg': '반투명 배경',
        'panel_width': '패널 너비',
        'panel_narrow': '좁게',
        'panel_medium': '보통',
        'panel_wide': '넓게',
        'auto_summarize': '요약 자동 제안',
        'language': '언어',
        'save_settings': '설정 저장',
        'shortcut_info': '모든 웹사이트에서 MSG를 열려면 / 를 빠르게 두 번 누르세요',
        'advanced_settings': '고급 설정',
        
        // Options
        'options_title': 'MSG 설정',
        'api_key_section': 'API 키',
        'gemini_api_key': 'Gemini API 키',
        'api_key_secure_server': '키는 기기에 안전하게 저장되며 어떤 서버와도 공유되지 않습니다.',
        'save_api_key': 'API 키 저장',
        'account_section': '계정',
        'not_signed_in': '로그인하지 않았습니다.',
        'appearance_section': '외관',
        'use_dark_mode': '다크 모드 사용 (그렇지 않으면 시스템 설정 따름)',
        'use_transparent_bg': '반투명 배경 사용',
        'behavior_section': '동작',
        'panel_width_narrow': '좁게 (300px)',
        'panel_width_medium': '보통 (380px)',
        'panel_width_wide': '넓게 (450px)',
        'auto_summarize_full': '패널이 열릴 때 자동으로 요약 제안',
        'enable_grounding': 'Google Grounding 활성화 (웹 검색으로 응답을 더 정확하게 만듭니다)',
        'grounding_when': 'Grounding 사용 시기:',
        'grounding_auto': '자동 (필요시)',
        'grounding_always': '항상',
        'grounding_explicit': '사용자가 요청할 때만',
        'keyboard_shortcut': '키보드 단축키',
        'shortcut_description': 'MSG 패널 열기/닫기: / 를 빠르게 두 번 누르기',
        'save_all_settings': '모든 설정 저장',
        
        // Status messages
        'api_key_saved': 'API 키가 성공적으로 저장되었습니다!',
        'settings_saved': '설정이 성공적으로 저장되었습니다!',
        'signin_successful': '로그인 성공',
        'signout_successful': '로그아웃 성공',
        'api_key_set': 'API 키가 설정되었습니다',
        'invalid_api_key': '유효한 API 키를 입력하세요',
        'signin_failed': '로그인 실패',
        'signout_failed': '로그아웃 오류',
        
        // Content script messages
        'chat_title': 'MSG 채팅',
        'ask_placeholder': '이 페이지에 대해 무엇이든 질문하세요...',
        'welcome_message': '안녕하세요! 저는 MSG, 당신의 웹 어시스턴트입니다. 이 페이지를 분석했으며 지능형 검색으로 콘텐츠 이해를 도울 수 있습니다.',
        'grounding_enabled_all': '모든 쿼리에 대해 웹 검색이 활성화되어 있습니다.',
        'grounding_enabled_auto': '필요시 웹 검색이 자동으로 사용됩니다.',
        'grounding_enabled_explicit': '명시적으로 요청할 때 (예: "검색...") 웹 검색을 사용할 수 있습니다.',
        'content_loaded': '콘텐츠를 로드했습니다 ({size}KB). {grounding} 빠른 개요를 보려면 "요약"을 입력하세요.',
        'content_loaded_simple': '콘텐츠를 로드했습니다 ({size}KB). 빠른 개요를 보려면 "요약"을 입력하세요.',
        'web_search_indicator': '웹 검색',
        'api_key_error': '오류: 설정에서 API 키를 확인하세요.'
      },
      
      ru: {
        // Popup
        'popup_title': 'MSG: Общайтесь с Любыми Сайтами',
        'enter_api_key': 'Введите ваш Gemini API ключ',
        'api_key_secure': 'Ваш ключ остается в безопасности на вашем устройстве и никогда не передается.',
        'api_key_placeholder': 'Вставьте ваш Gemini API ключ сюда',
        'save_key': 'Сохранить Ключ',
        'get_api_key': '🔑 Получить API ключ из AI Studio',
        'signin_google': 'Войдите через Google для дополнительных функций (опционально):',
        'signin_button': 'Войти через Google',
        'signed_in_as': 'Вошли как',
        'sign_out': 'Выйти',
        'quick_settings': 'Быстрые Настройки',
        'dark_mode': 'Темный режим',
        'transparent_bg': 'Полупрозрачный фон',
        'panel_width': 'Ширина Панели',
        'panel_narrow': 'Узкая',
        'panel_medium': 'Средняя',
        'panel_wide': 'Широкая',
        'auto_summarize': 'Автоматически предлагать резюме',
        'language': 'Язык',
        'save_settings': 'Сохранить Настройки',
        'shortcut_info': 'Нажмите / дважды быстро чтобы открыть MSG на любом сайте',
        'advanced_settings': 'Дополнительные Настройки',
        
        // Options
        'options_title': 'Настройки MSG',
        'api_key_section': 'API Ключ',
        'gemini_api_key': 'Gemini API Ключ',
        'api_key_secure_server': 'Ваш ключ остается в безопасности на вашем устройстве и никогда не передается на сервер.',
        'save_api_key': 'Сохранить API Ключ',
        'account_section': 'Аккаунт',
        'not_signed_in': 'Вы не вошли в систему.',
        'appearance_section': 'Внешний Вид',
        'use_dark_mode': 'Использовать темный режим (иначе следует системным настройкам)',
        'use_transparent_bg': 'Использовать полупрозрачный фон',
        'behavior_section': 'Поведение',
        'panel_width_narrow': 'Узкая (300px)',
        'panel_width_medium': 'Средняя (380px)',
        'panel_width_wide': 'Широкая (450px)',
        'auto_summarize_full': 'Автоматически предлагать резюме при открытии панели',
        'enable_grounding': 'Включить Google Grounding (делает ответы более точными через поиск в интернете)',
        'grounding_when': 'Когда использовать grounding:',
        'grounding_auto': 'Автоматически (при необходимости)',
        'grounding_always': 'Всегда',
        'grounding_explicit': 'Только по запросу пользователя',
        'keyboard_shortcut': 'Горячие Клавиши',
        'shortcut_description': 'Открыть/закрыть панель MSG: Нажмите / дважды быстро',
        'save_all_settings': 'Сохранить Все Настройки',
        
        // Status messages
        'api_key_saved': 'API ключ успешно сохранен!',
        'settings_saved': 'Настройки успешно сохранены!',
        'signin_successful': 'Вход выполнен успешно',
        'signout_successful': 'Выход выполнен успешно',
        'api_key_set': 'API ключ установлен',
        'invalid_api_key': 'Пожалуйста, введите действительный API ключ',
        'signin_failed': 'Ошибка входа',
        'signout_failed': 'Ошибка выхода',
        
        // Content script messages
        'chat_title': 'MSG Чат',
        'ask_placeholder': 'Спросите что-нибудь об этой странице...',
        'welcome_message': 'Привет! Я MSG, ваш веб-ассистент. Я проанализировал эту страницу и могу помочь понять её содержимое с помощью интеллектуального поиска.',
        'grounding_enabled_all': 'Веб-поиск включен для всех запросов.',
        'grounding_enabled_auto': 'Веб-поиск будет использоваться автоматически при необходимости.',
        'grounding_enabled_explicit': 'Веб-поиск доступен при явном запросе (например, "найти...").',
        'content_loaded': 'Контент загружен ({size}КБ). {grounding} Введите "суммировать" для быстрого обзора.',
        'content_loaded_simple': 'Контент загружен ({size}КБ). Введите "суммировать" для быстрого обзора.',
        'web_search_indicator': 'Веб-поиск',
        'api_key_error': 'Ошибка: Проверьте ваш API ключ в настройках.'
      }
    };
  }

  // Set the current language
  setLanguage(language) {
    if (this.translations[language]) {
      this.currentLanguage = language;
      return true;
    }
    return false;
  }

  // Get translation for a key
  t(key) {
    const translation = this.translations[this.currentLanguage]?.[key];
    return translation || this.translations['en'][key] || key;
  }

  // Update all translatable elements on the page
  updatePageTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password')) {
        element.placeholder = this.t(key);
      } else if (element.tagName === 'OPTION') {
        element.textContent = this.t(key);
      } else {
        element.textContent = this.t(key);
      }
    });

    // Update title based on page type
    const titleElement = document.querySelector('title');
    if (titleElement) {
      if (titleElement.hasAttribute('data-i18n')) {
        const titleKey = titleElement.getAttribute('data-i18n');
        titleElement.textContent = this.t(titleKey);
      } else if (titleElement.textContent.includes('MSG')) {
        // Fallback for pages without data-i18n on title
        if (titleElement.textContent.includes('Settings')) {
          titleElement.textContent = this.t('options_title');
        } else {
          titleElement.textContent = this.t('popup_title');
        }
      }
    }
  }
}

// Create global i18n instance
window.i18n = new I18n();
