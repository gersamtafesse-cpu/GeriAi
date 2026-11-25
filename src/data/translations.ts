import type { Language, PromptCategory, QuickPrompt } from '../types/chat';

export interface Translations {
  brandName: string;
  brandTagline: string;
  newChat: string;
  searchHistory: string;
  noHistory: string;
  noSearchResults: string;
  clearHistory: string;
  confirmClear: string;
  cancel: string;
  deleteChat: string;
  openSidebar: string;
  closeSidebar: string;
  toggleThemeLight: string;
  toggleThemeDark: string;
  languageLabel: string;
  responseLangLabel: string;
  responseLangAuto: string;
  responseLangAm: string;
  responseLangEn: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  quickPromptsHeading: string;
  categories: Record<PromptCategory, string>;
  composerPlaceholder: string;
  composerHint: string;
  send: string;
  stopGenerating: string;
  copyResponse: string;
  copied: string;
  copyCode: string;
  regenerate: string;
  retry: string;
  sourcesLabel: string;
  you: string;
  assistantName: string;
  thinking: string;
  groups: {
    today: string;
    yesterday: string;
    week: string;
    older: string;
  };
  untitledChat: string;
  errorFallback: string;
  micStart: string;
  micStop: string;
  micListening: string;
  micTranscribing: string;
  micReadyToReview: string;
  micHdModeLabel: string;
  micHdModeTitle: string;
  micBrowserModeLabel: string;
  micUnsupported: string;
  micPermissionDenied: string;
  micNoSpeech: string;
  micNoMicrophone: string;
  micLanguageUnsupported: string;
  micNetworkError: string;
  micGenericError: string;
  micTranscribeError: string;
  listen: string;
  stopReading: string;
  voiceEffectLabel: string;
  voiceEffects: {
    natural: string;
    warm: string;
    bright: string;
    slow: string;
  };
  soundFxOn: string;
  soundFxOff: string;
  soundFxLabel: string;
  speechUnsupported: string;
  speechNothingToRead: string;
  speechAmharicLimited: string;
  speechPlaybackFailed: string;
  dismiss: string;
  aboutCreator: string;
  founderSectionHeading: string;
  viewFounderProfile: string;
  creatorModalTitle: string;
  creatorNameLabel: string;
  creatorName: string;
  creatorAgeLabel: string;
  creatorAgeValue: string;
  creatorEducationLabel: string;
  creatorEducationValue: string;
  creatorRole: string;
  creatorBioEn: string;
  creatorBioAm: string;
  creatorEnglishLabel: string;
  creatorAmharicLabel: string;
  closeModal: string;
  attachFile: string;
  removeAttachment: string;
  dropFilesHere: string;
  attachmentUnsupported: string;
  attachmentTooLarge: string;
  attachmentTotalTooLarge: string;
  attachmentReadFailed: string;
  attachmentCountLimit: string;
  attachmentFallbackLabel: string;
  imageModeToggle: string;
  imageModeActive: string;
  imagePromptPlaceholder: string;
  imageAspectRatioLabel: string;
  generatingImage: string;
  downloadImage: string;
  imageEmptyError: string;
  imageQuotaFriendly: string;
  chatQuotaFriendly: string;
  chatTimeoutFriendly: string;
  exitImageMode: string;
  liveMode: string;
  liveModeStart: string;
  liveModeStop: string;
  liveListening: string;
  liveSpeaking: string;
  liveThinking: string;
  liveSendNow: string;
  livePromptPlaceholder: string;
  liveMicUnavailableNotice: string;
  bottomDisclaimer: string;
  creatorSchoolLabel: string;
  creatorSchoolValue: string;
  creatorQuote: string;
  starterChips: Array<{
    id: string;
    label: string;
    prompt: string;
    isImage?: boolean;
  }>;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    brandName: 'GeriAi',
    brandTagline: 'Bilingual AI Assistant',
    newChat: 'New Chat',
    searchHistory: 'Search conversations...',
    noHistory: 'No conversations yet. Start a new chat to begin.',
    noSearchResults: 'No matching conversations found.',
    clearHistory: 'Clear all history',
    confirmClear: 'Confirm clear all',
    cancel: 'Cancel',
    deleteChat: 'Delete conversation',
    openSidebar: 'Open sidebar',
    closeSidebar: 'Collapse sidebar',
    toggleThemeLight: 'Switch to light mode',
    toggleThemeDark: 'Switch to dark mode',
    languageLabel: 'Interface language',
    responseLangLabel: 'Reply in',
    responseLangAuto: 'Auto',
    responseLangAm: 'አማርኛ',
    responseLangEn: 'English',
    welcomeTitle: 'Welcome to GeriAi',
    welcomeSubtitle: 'How can I help you today?',
    quickPromptsHeading: 'Quick prompt suggestions',
    categories: {
      all: 'All',
      study: 'Study Help',
      writing: 'Writing',
      translation: 'Translation',
      coding: 'Coding & Math',
    },
    composerPlaceholder: 'Message GeriAi in Amharic or English...',
    composerHint: 'Press Enter to send, Shift + Enter for a new line',
    send: 'Send message',
    stopGenerating: 'Stop generating',
    copyResponse: 'Copy',
    copied: 'Copied',
    copyCode: 'Copy code',
    regenerate: 'Regenerate',
    retry: 'Retry',
    sourcesLabel: 'Sources',
    you: 'You',
    assistantName: 'GeriAi',
    thinking: 'Thinking...',
    groups: {
      today: 'Today',
      yesterday: 'Yesterday',
      week: 'Previous 7 Days',
      older: 'Older',
    },
    untitledChat: 'New Conversation',
    errorFallback: 'Unable to reach GeriAi right now. Please try again.',
    micStart: 'Speak to type',
    micStop: 'Stop & transcribe',
    micListening: 'Listening — speak naturally, pause anytime',
    micTranscribing: 'Transcribing your voice accurately...',
    micReadyToReview: 'Transcribed — review or edit below, then press Send',
    micHdModeLabel: 'HD Voice',
    micHdModeTitle: 'Use Gemini HD audio recognition (best for Amharic & accents)',
    micBrowserModeLabel: 'Live STT',
    micUnsupported: 'Voice input is not supported in this browser.',
    micPermissionDenied: 'Microphone access was blocked. Allow microphone permission to use voice input.',
    micNoSpeech: 'No speech detected. Try speaking a bit closer to your microphone.',
    micNoMicrophone: 'No microphone was found on this device.',
    micLanguageUnsupported: 'Browser speech failed for this language; switching to HD Voice recognition.',
    micNetworkError: 'Voice recognition hit a network error. Please check your connection and try again.',
    micGenericError: 'Could not start voice input. Please try again or type your message.',
    micTranscribeError: 'Could not transcribe audio right now. Please try again or type your message.',
    listen: 'Listen',
    stopReading: 'Stop',
    voiceEffectLabel: 'Voice effect',
    voiceEffects: {
      natural: 'Natural',
      warm: 'Warm',
      bright: 'Bright',
      slow: 'Slow & Clear',
    },
    soundFxOn: 'Sound FX On',
    soundFxOff: 'Sound FX Off',
    soundFxLabel: 'Toggle voice sound effects',
    speechUnsupported: 'Read-aloud is not supported in this browser.',
    speechNothingToRead: 'There is no readable text in this response.',
    speechAmharicLimited:
      'Your browser does not have an Amharic voice installed, so Amharic speech playback may be limited or unavailable.',
    speechPlaybackFailed: 'Unable to play speech audio in this browser.',
    dismiss: 'Dismiss',
    aboutCreator: 'About the Founder',
    founderSectionHeading: 'About the Founder',
    viewFounderProfile: 'Read founder story',
    creatorModalTitle: 'About the Founder',
    creatorNameLabel: 'Founder & Creator',
    creatorName: 'Gersam Tafesse',
    creatorAgeLabel: 'Age',
    creatorAgeValue: '17 years old',
    creatorEducationLabel: 'Grade',
    creatorEducationValue: 'Grade 10 Student',
    creatorSchoolLabel: 'School',
    creatorSchoolValue: 'Abonsa Grace Chun Adventist School',
    creatorRole: '17 years old · Grade 10 at Abonsa Grace Chun Adventist School',
    creatorBioEn:
      'GeriAi was founded by Gersam Tafesse, a 17-year-old Grade 10 student at Abonsa Grace Chun Adventist School. Driven by deep curiosity, a love for problem-solving, and a passion for technology and artificial intelligence, he created GeriAi to give students and everyday people a fast, helpful, and accessible AI companion—showing that big ideas and real innovation can start young with determination and passion.',
    creatorBioAm:
      'GeriAi የተመሠረተው በአቦንሳ ግሬስ ቹን አድቬንቲስት ትምህርት ቤት (Abonsa Grace Chun Adventist School) የ10ኛ ክፍል ተማሪ በሆነው በ17 ዓመቱ ጌርሳም ታፈሰ (Gersam Tafesse) ነው። ለቴክኖሎጂ እና ለሰው ሰራሽ አስተውሎት (AI) ባለው ጥልቅ ፍቅር፣ ችግሮችን የመፍታት ጉጉት እና ለተማሪዎች እንዲሁም ለማንኛውም ተጠቃሚ ፈጣንና አጋዥ መሳሪያ የመገንባት ራዕይ ተነሳስቶ GeriAiን ፈጥሯል—ትልቅ ሀሳብ እና እውነተኛ ፈጠራ በልጅነትም በቁርጠኝነትና በፍላጎት መጀመር እንደሚችሉ በማሳየት።',
    creatorQuote:
      'Big ideas and real innovation can start young—with curiosity, determination, and passion.',
    creatorEnglishLabel: 'Founder Story',
    creatorAmharicLabel: 'የመስራቹ ታሪክ',
    closeModal: 'Close',
    attachFile: 'Attach image or file',
    removeAttachment: 'Remove attachment',
    dropFilesHere: 'Drop images or files to attach',
    attachmentUnsupported:
      'Unsupported file type. Supported: PNG, JPG, WEBP, GIF, PDF, TXT, CSV, code, and audio files.',
    attachmentTooLarge:
      'File is too large. Images, PDFs, and audio must be under 18 MB (text/code files under 2 MB).',
    attachmentTotalTooLarge:
      'Total attachment size exceeds 32 MB for a single message.',
    attachmentReadFailed: 'Could not read the selected file. Please try again.',
    attachmentCountLimit: 'You can attach up to 6 files per message.',
    attachmentFallbackLabel: 'Analyze the attached file(s)',
    imageModeToggle: 'Create image',
    imageModeActive: 'Image mode on',
    imagePromptPlaceholder: 'Describe any image to generate in English or Amharic...',
    imageAspectRatioLabel: 'Aspect ratio',
    generatingImage: 'Generating image...',
    downloadImage: 'Download',
    imageEmptyError: 'No image was generated for that prompt. Try describing the scene in more detail.',
    imageQuotaFriendly:
      'Image generation is temporarily busy due to high demand. Please try again in a moment!',
    chatQuotaFriendly:
      'Free API limit reached for this minute. Please wait 30 seconds and tap Retry.',
    chatTimeoutFriendly:
      'GeriAi took too long to respond on this connection. Please try again.',
    exitImageMode: 'Exit image mode',
    liveMode: 'Live',
    liveModeStart: 'Start live voice chat',
    liveModeStop: 'End live',
    liveListening: 'Live voice active — speak naturally, pause to send',
    liveSpeaking: 'Live voice active — reading reply aloud',
    liveThinking: 'Live voice active — getting your reply...',
    liveSendNow: 'Send now',
    livePromptPlaceholder: 'Speak naturally or type in Live voice mode...',
    liveMicUnavailableNotice:
      'Microphone speech input is not supported in this browser, so Live mode will read GeriAi replies aloud automatically.',
    bottomDisclaimer: 'GeriAi can make mistakes. Check important info.',
    starterChips: [
      {
        id: 'chip-code',
        label: 'Write clean code',
        prompt: 'Write a clean, well-explained TypeScript function to debounce API calls with an example.',
      },
      {
        id: 'chip-science',
        label: 'Explain a big idea',
        prompt: 'Explain how quantum computers differ from classical computers in simple, clear steps.',
      },
      {
        id: 'chip-business',
        label: 'Brainstorm a project',
        prompt: 'Give me 5 practical steps to launch an impactful student or community tech project from scratch.',
      },
      {
        id: 'chip-image',
        label: 'Create an image',
        prompt: 'A glowing futuristic library in the mountains at sunrise, digital art',
        isImage: true,
      },
    ],
  },
  am: {
    brandName: 'GeriAi',
    brandTagline: 'ባለሁለት ቋንቋ የAI ረዳት',
    newChat: 'አዲስ ውይይት',
    searchHistory: 'ውይይቶችን ይፈልጉ...',
    noHistory: 'እስካሁን ምንም ውይይት የለም። ለመጀመር አዲስ ውይይት ይክፈቱ።',
    noSearchResults: 'ተዛማጅ ውይይት አልተገኘም።',
    clearHistory: 'ሁሉንም ታሪክ አጥፋ',
    confirmClear: 'ሁሉንም ማጥፋት አረጋግጥ',
    cancel: 'ሰርዝ',
    deleteChat: 'ውይይቱን ሰርዝ',
    openSidebar: 'የጎን አሞሌን ክፈት',
    closeSidebar: 'የጎን አሞሌን ዝጋ',
    toggleThemeLight: 'ወደ ብርሃን ገጽታ ቀይር',
    toggleThemeDark: 'ወደ ጨለማ ገጽታ ቀይር',
    languageLabel: 'የገጽታ ቋንቋ',
    responseLangLabel: 'ምላሽ በ',
    responseLangAuto: 'ራስ-ሰር',
    responseLangAm: 'አማርኛ',
    responseLangEn: 'English',
    welcomeTitle: 'እንኳን ወደ GeriAi በደህና መጡ',
    welcomeSubtitle: 'ዛሬ በምን ልርዳዎት?',
    quickPromptsHeading: 'ፈጣን የጥያቄ ሀሳቦች',
    categories: {
      all: 'ሁሉም',
      study: 'የጥናት እገዛ',
      writing: 'ጽሑፍ',
      translation: 'ትርጉም',
      coding: 'ኮድ እና ሂሳብ',
    },
    composerPlaceholder: 'ለGeriAi በአማርኛ ወይም በእንግሊዝኛ ይጻፉ...',
    composerHint: 'ለመላክ Enter ይጫኑ፣ አዲስ መስመር ለመጀመር Shift + Enter',
    send: 'መልእክት ላክ',
    stopGenerating: 'ማመንጨት አቁም',
    copyResponse: 'ቅዳ',
    copied: 'ተቀድቷል',
    copyCode: 'ኮድ ቅዳ',
    regenerate: 'እንደገና ፍጠር',
    retry: 'እንደገና ሞክር',
    sourcesLabel: 'ምንጮች',
    you: 'እርስዎ',
    assistantName: 'GeriAi',
    thinking: 'በማሰብ ላይ...',
    groups: {
      today: 'ዛሬ',
      yesterday: 'ትናንት',
      week: 'ባለፉት 7 ቀናት',
      older: 'የቆዩ',
    },
    untitledChat: 'አዲስ ውይይት',
    errorFallback: 'ከGeriAi ጋር መገናኘት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    micStart: 'በድምፅ ይጻፉ',
    micStop: 'አቁም እና ጽሑፍ አውጣ',
    micListening: 'በማዳመጥ ላይ — በተፈጥሮ ይናገሩ፣ መሃል ላይ ቢቆሙም አይቋረጥም',
    micTranscribing: 'ድምፅዎን በትክክል ወደ ጽሑፍ በመቀየር ላይ...',
    micReadyToReview: 'ተጽፏል — ከስር አረጋግጠው ወይም አስተካክለው ይላኩ',
    micHdModeLabel: 'HD ድምፅ',
    micHdModeTitle: 'ከፍተኛ ትክክለኛነት ያለው የGemini ድምፅ ማወቂያ (ለአማርኛ እና ለተለያዩ ቅላጼዎች)',
    micBrowserModeLabel: 'ቀጥታ ጽሑፍ',
    micUnsupported: 'በዚህ አሳሽ ውስጥ የድምፅ ግብዓት አይደገፍም።',
    micPermissionDenied: 'የማይክሮፎን ፈቃድ ተከልክሏል። የድምፅ ግብዓትን ለመጠቀም እባክዎ ፈቃድ ይስጡ።',
    micNoSpeech: 'ምንም ንግግር አልተሰማም። ወደ ማይክሮፎኑ ቀረብ ብለው እንደገና ይሞክሩ።',
    micNoMicrophone: 'በዚህ መሣሪያ ላይ ማይክሮፎን አልተገኘም።',
    micLanguageUnsupported: 'ይህ አሳሽ ቋንቋውን ስላልደገፈው ወደ HD ድምፅ ማወቂያ ተቀይሯል።',
    micNetworkError: 'የድምፅ ማወቂያ የኔትወርክ ስህተት አጋጥሞታል። ግንኙነትዎን ያረጋግጡ።',
    micGenericError: 'የድምፅ ግብዓትን መጀመር አልተቻለም። እባክዎ እንደገና ይሞክሩ ወይም ይጻፉ።',
    micTranscribeError: 'ድምፁን ለጊዜው ወደ ጽሑፍ መቀየር አልተቻለም። እባክዎ እንደገና ይሞክሩ ወይም ይጻፉ።',
    listen: 'አዳምጥ',
    stopReading: 'አቁም',
    voiceEffectLabel: 'የድምፅ ቅላጼ',
    voiceEffects: {
      natural: 'ተፈጥሯዊ',
      warm: 'ረጋ ያለ',
      bright: 'ብሩህ',
      slow: 'ዝግ ያለ',
    },
    soundFxOn: 'የድምፅ ውጤት በርቷል',
    soundFxOff: 'የድምፅ ውጤት ጠፍቷል',
    soundFxLabel: 'የድምፅ ውጤቶችን አብራ/አጥፋ',
    speechUnsupported: 'በዚህ አሳሽ ውስጥ ጽሑፍን በድምፅ ማንበብ አይደገፍም።',
    speechNothingToRead: 'በዚህ ምላሽ ውስጥ የሚነበብ ጽሑፍ የለም።',
    speechAmharicLimited:
      'ይህ አሳሽ የአማርኛ ድምፅ ስለሌለው የአማርኛ ንባብ ውስን ሊሆን ወይም ላይሰራ ይችላል።',
    speechPlaybackFailed: 'በዚህ አሳሽ ውስጥ የድምፅ ንባብን ማጫወት አልተቻለም።',
    dismiss: 'ዝጋ',
    aboutCreator: 'ስለ መስራቹ',
    founderSectionHeading: 'ስለ መስራቹ',
    viewFounderProfile: 'የመስራቹን ታሪክ ያንብቡ',
    creatorModalTitle: 'ስለ መስራቹ',
    creatorNameLabel: 'መስራች እና ፈጣሪ',
    creatorName: 'ጌርሳም ታፈሰ (Gersam Tafesse)',
    creatorAgeLabel: 'ዕድሜ',
    creatorAgeValue: '17 ዓመት',
    creatorEducationLabel: 'ክፍል',
    creatorEducationValue: 'የ10ኛ ክፍል ተማሪ',
    creatorSchoolLabel: 'ትምህርት ቤት',
    creatorSchoolValue: 'አቦንሳ ግሬስ ቹን አድቬንቲስት ትምህርት ቤት (Abonsa Grace Chun Adventist School)',
    creatorRole: '17 ዓመት · የ10ኛ ክፍል ተማሪ (Abonsa Grace Chun Adventist School)',
    creatorBioEn:
      'GeriAi was founded by Gersam Tafesse, a 17-year-old Grade 10 student at Abonsa Grace Chun Adventist School. Driven by deep curiosity, a love for problem-solving, and a passion for technology and artificial intelligence, he created GeriAi to give students and everyday people a fast, helpful, and accessible AI companion—showing that big ideas and real innovation can start young with determination and passion.',
    creatorBioAm:
      'GeriAi የተመሠረተው በአቦንሳ ግሬስ ቹን አድቬንቲስት ትምህርት ቤት (Abonsa Grace Chun Adventist School) የ10ኛ ክፍል ተማሪ በሆነው በ17 ዓመቱ ጌርሳም ታፈሰ (Gersam Tafesse) ነው። ለቴክኖሎጂ እና ለሰው ሰራሽ አስተውሎት (AI) ባለው ጥልቅ ፍቅር፣ ችግሮችን የመፍታት ጉጉት እና ለተማሪዎች እንዲሁም ለማንኛውም ተጠቃሚ ፈጣንና አጋዥ መሳሪያ የመገንባት ራዕይ ተነሳስቶ GeriAiን ፈጥሯል—ትልቅ ሀሳብ እና እውነተኛ ፈጠራ በልጅነትም በቁርጠኝነትና በፍላጎት መጀመር እንደሚችሉ በማሳየት።',
    creatorQuote:
      'ትልቅ ሀሳብ እና እውነተኛ ፈጠራ በልጅነትም በቁርጠኝነት እና በፍላጎት መጀመር ይችላሉ።',
    creatorEnglishLabel: 'Founder Story',
    creatorAmharicLabel: 'የመስራቹ ታሪክ',
    closeModal: 'ዝጋ',
    attachFile: 'ምስል ወይም ፋይል አያይዝ',
    removeAttachment: 'አባሪውን አስወግድ',
    dropFilesHere: 'ለማያያዝ ምስሎችን ወይም ፋይሎችን እዚህ ይጣሉ',
    attachmentUnsupported:
      'የማይደገፍ የፋይል ዓይነት። የሚደገፉት: PNG, JPG, WEBP, GIF, PDF, TXT, CSV, ኮድ እና የድምፅ ፋይሎች ናቸው።',
    attachmentTooLarge:
      'ፋይሉ በጣም ትልቅ ነው። ምስሎች፣ PDF እና ድምፅ ከ18 MB በታች (የጽሑፍ/ኮድ ፋይሎች ከ2 MB በታች) መሆን አለባቸው።',
    attachmentTotalTooLarge:
      'የአባሪዎቹ አጠቃላይ መጠን ለአንድ መልእክት ከ32 MB በላይ መሆን የለበትም።',
    attachmentReadFailed: 'የተመረጠውን ፋይል ማንበብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    attachmentCountLimit: 'በአንድ መልእክት እስከ 6 ፋይሎችን ማያያዝ ይችላሉ።',
    attachmentFallbackLabel: 'የተያያዙትን ፋይሎች ተንትን',
    imageModeToggle: 'ምስል ፍጠር',
    imageModeActive: 'የምስል ፈጠራ በርቷል',
    imagePromptPlaceholder: 'መፍጠር የሚፈልጉትን ምስል በአማርኛ ወይም በእንግሊዝኛ ይግለጹ...',
    imageAspectRatioLabel: 'የምስል መጠን',
    generatingImage: 'ምስል በማመንጨት ላይ...',
    downloadImage: 'አውርድ',
    imageEmptyError: 'ለዚህ ጥያቄ ምስል መፍጠር አልተቻለም። እባክዎ ምስሉን በበለጠ ዝርዝር ይግለጹት።',
    imageQuotaFriendly:
      'የምስል መፍጠሪያ አገልግሎቱ ለጊዜው በብዛት ጥቅም ላይ ስለዋለ ተጨናንቋል። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ!',
    chatQuotaFriendly:
      'የዚህ ደቂቃ ነጻ የAPI ገደብ ተደርሷል። እባክዎ 30 ሰከንድ ጠብቀው እንደገና ይሞክሩ።',
    chatTimeoutFriendly:
      'ግንኙነቱ ረዘም ያለ ጊዜ ስለወሰደ GeriAi ምላሽ መስጠት አልቻለም። እባክዎ እንደገና ይሞክሩ።',
    exitImageMode: 'ከምስል ፈጠራ ውጣ',
    liveMode: 'ቀጥታ',
    liveModeStart: 'የቀጥታ የድምፅ ውይይት ጀምር',
    liveModeStop: 'ቀጥታ አቁም',
    liveListening: 'የቀጥታ ድምፅ ነቅቷል — በተፈጥሮ ይናገሩ፣ ሲያቆሙ ይላካል',
    liveSpeaking: 'የቀጥታ ድምፅ ነቅቷል — ምላሹን በማንበብ ላይ',
    liveThinking: 'የቀጥታ ድምፅ ነቅቷል — ምላሽ በመጠበቅ ላይ...',
    liveSendNow: 'አሁን ላክ',
    livePromptPlaceholder: 'በቀጥታ የድምፅ ሁነታ ይናገሩ ወይም ይጻፉ...',
    liveMicUnavailableNotice:
      'በዚህ አሳሽ የማይክሮፎን ንግግር ስለማይደገፍ፣ የቀጥታ ሁነታ የGeriAi ምላሾችን በራስ-ሰር በድምፅ ያነባል።',
    bottomDisclaimer: 'ጌሪ AI ስህተት ሊሰራ ይችላል፤ አስፈላጊ መረጃዎችን ያረጋግጡ።',
    starterChips: [
      {
        id: 'chip-code',
        label: 'ንጹህ ኮድ ጻፍ',
        prompt: 'በPython የቁጥሮችን ዝርዝር ወስዶ አማካይ እና ሚዲያን የሚያሰላ ንጹህ ፈንክሽን ከማብራሪያ ጋር ጻፍልኝ።',
      },
      {
        id: 'chip-science',
        label: 'ትልቅ ሀሳብ አብራራ',
        prompt: 'አርቴፊሻል ኢንተለጀንስ (AI) እንዴት እንደሚማር እና በዕለት ተዕለት ሕይወት እንዴት እንደሚረዳ በቀላል አማርኛ አስረዳኝ።',
      },
      {
        id: 'chip-business',
        label: 'ፕሮጀክት አቅድ',
        prompt: 'አንድ አነስተኛ የቴክኖሎጂ ወይም የማህበረሰብ ፕሮጀክት ከዜሮ ለመጀመር 5 ተግባራዊ እርምጃዎችን ስጠኝ።',
      },
      {
        id: 'chip-image',
        label: 'ምስል ፍጠር',
        prompt: 'በፀሐይ መውጫ ጊዜ በተራራዎች መካከል የሚያበራ ዘመናዊ ቤተ-መጻሕፍት፣ ዲጂታል ጥበብ',
        isImage: true,
      },
    ],
  },
};

export const QUICK_PROMPTS: Record<Language, QuickPrompt[]> = {
  en: [
    {
      id: 'en-study-1',
      category: 'study',
      title: 'Break down a biology concept',
      description: 'Explain cellular respiration clearly with key stages and a quick self-quiz.',
      prompt:
        'Explain cellular respiration in clear, simple steps for a university biology exam, and give me 3 quick practice questions with answers.',
    },
    {
      id: 'en-study-2',
      category: 'study',
      title: 'Create a 5-day study plan',
      description: 'Organize an exam revision schedule around core chapters and active recall.',
      prompt:
        'Help me build a focused 5-day study plan using active recall and spaced repetition to prepare for an upcoming economics midterm.',
    },
    {
      id: 'en-writing-1',
      category: 'writing',
      title: 'Draft a professional email',
      description: 'Write a concise, polite project follow-up email with clear next steps.',
      prompt:
        'Write a concise, polite professional email following up with a partner organization about our joint community education proposal and proposing next steps.',
    },
    {
      id: 'en-writing-2',
      category: 'writing',
      title: 'Improve clarity and tone',
      description: 'Refine a rough paragraph into crisp, persuasive prose without losing voice.',
      prompt:
        'Polish the following paragraph for clarity, flow, and conciseness, and explain the key improvements: "Our team has been working very hard on trying to make sure the new software tool is easy for everyone to use even if they are beginners."',
    },
    {
      id: 'en-translation-1',
      category: 'translation',
      title: 'Translate English to Amharic',
      description: 'Natural translation preserving tone, idioms, and formal business phrasing.',
      prompt:
        'Translate this message into natural, polite Amharic suitable for a formal announcement, and provide an alternative conversational phrasing: "Thank you for joining our workshop today. Together, we can build practical solutions that serve our community."',
    },
    {
      id: 'en-translation-2',
      category: 'translation',
      title: 'Translate Amharic to English',
      description: 'Translate Amharic proverbs or formal passages with cultural context.',
      prompt:
        'Translate the Amharic proverb "ቀስ በቀስ እንቁላል በእግሩ ይሄዳል" into English, explain its literal meaning, and share its closest English equivalent.',
    },
    {
      id: 'en-coding-1',
      category: 'coding',
      title: 'Debug & explain a TypeScript function',
      description: 'Spot edge cases, optimize time complexity, and show clean refactored code.',
      prompt:
        'Write a clean TypeScript function that groups an array of items by date category (Today, Yesterday, Older) safely across timezones, and explain its time complexity.',
    },
    {
      id: 'en-coding-2',
      category: 'coding',
      title: 'Solve a calculus problem step-by-step',
      description: 'Walk through derivatives or integrals with clear algebraic justification.',
      prompt:
        'Solve the integral of (2x + 3) / (x^2 + 3x + 5) dx step by step using u-substitution, and verify the answer by differentiating.',
    },
  ],
  am: [
    {
      id: 'am-study-1',
      category: 'study',
      title: 'የሳይንስ ርዕስን በቀላሉ አስረዳ',
      description: 'የፎቶሲንተሲስ ሂደትን ደረጃ በደረጃ እና ከፈተና ጥያቄዎች ጋር ተማር።',
      prompt:
        'የፎቶሲንተሲስ (Photosynthesis) ሂደትን ለሁለተኛ ደረጃ ተማሪ በሚገባ መልኩ ደረጃ በደረጃ በአማርኛ አስረዳኝ፤ በመጨረሻም 3 የልምምድ ጥያቄዎች ከመልሳቸው ጋር ስጠኝ።',
    },
    {
      id: 'am-study-2',
      category: 'study',
      title: 'የ5 ቀን የጥናት ፕሮግራም አዘጋጅ',
      description: 'ለፈተና ዝግጅት ውጤታማ የክለሳ እና የልምምድ መርሃ ግብር ፍጠር።',
      prompt:
        'ለመጪው የሂሳብ እና የፊዚክስ ፈተና በ5 ቀናት ውስጥ ውጤታማ በሆነ መንገድ ለመዘጋጀት የሚረዳ የጥናት መርሃ ግብር አዘጋጅልኝ።',
    },
    {
      id: 'am-writing-1',
      category: 'writing',
      title: 'መደበኛ የስራ ደብዳቤ ወይም ኢሜይል ጻፍ',
      description: 'ግልጽ እና ትህትና ያለው የትብብር ጥያቄ ደብዳቤ በአማርኛ አዘጋጅ።',
      prompt:
        'ለአንድ የቴክኖሎጂ ድርጅት የስልጠና ትብብር ለመጠየቅ የሚሆን አጭር፣ ግልጽ እና መደበኛ የአማርኛ ኢሜይል ጻፍልኝ።',
    },
    {
      id: 'am-writing-2',
      category: 'writing',
      title: 'ጽሑፍን አስተካክል እና አሳምር',
      description: 'የአማርኛ ጽሑፍን ሰዋስው እና አገላለጽ ይበልጥ ግልጽ አድርግ።',
      prompt:
        'የሚከተለውን ዓረፍተ ነገር በመደበኛ እና በሳቢ አማርኛ አርመህ አቅርብልኝ፡ "ቴክኖሎጂ በአሁኑ ጊዜ ለተማሪዎች ትምህርታቸውን በቀላሉ እንዲረዱ እና ስራቸውን በፍጥነት እንዲሰሩ ብዙ እየጠቀመ ይገኛል።"',
    },
    {
      id: 'am-translation-1',
      category: 'translation',
      title: 'ከእንግሊዝኛ ወደ አማርኛ ተርጉም',
      description: 'መልእክቱን ትርጉሙን ሳይለቅ በተፈጥሯዊ አማርኛ ተርጉም።',
      prompt:
        'ይህንን የእንግሊዝኛ ጽሑፍ ወደ ተፈጥሯዊ እና ግልጽ አማርኛ ተርጉምልኝ፡ "Consistent daily practice turns complex skills into second nature over time."',
    },
    {
      id: 'am-translation-2',
      category: 'translation',
      title: 'ከአማርኛ ወደ እንግሊዝኛ ተርጉም',
      description: 'የአማርኛ ምሳሌያዊ አነጋገሮችን ትርጉም እና አቻ አገላለጽ አብራራ።',
      prompt:
        '"ድር ቢያብር አንበሳ ያስር" የሚለውን የአማርኛ ምሳሌ ወደ እንግሊዝኛ ተርጉመህ ትርጉሙን እና ተመሳሳይ የእንግሊዝኛ ምሳሌን አብራራልኝ።',
    },
    {
      id: 'am-coding-1',
      category: 'coding',
      title: 'የPython ኮድ ጻፍ እና አብራራ',
      description: 'በPython የመረጃ ዝርዝርን የሚያጣራ ንጹህ ፈንክሽን ፍጠር።',
      prompt:
        'በPython ውስጥ የቁጥሮችን ዝርዝር ወስዶ ዋና ቁጥሮችን (prime numbers) ብቻ የሚመልስ ንጹህ ፈንክሽን ጻፍልኝ እና እንዴት እንደሚሰራ በአማርኛ አብራራልኝ።',
    },
    {
      id: 'am-coding-2',
      category: 'coding',
      title: 'የሂሳብ እኩልታን ደረጃ በደረጃ ፍታ',
      description: 'የኳድራቲክ እኩልታን አፈታት እና ማረጋገጫ በግልጽ አሳይ።',
      prompt:
        '3x² - 11x + 6 = 0 የሚለውን የሂሳብ እኩልታ ደረጃ በደረጃ በአማርኛ ፍታው እና መልሱን በመተካት አረጋግጥ።',
    },
  ],
};
