# ThoughtAnchor

[Toutes les langues](../README.md) · [Télécharger Windows / Android](https://github.com/kkaede4444/ThoughtAnchor/releases/latest)

ThoughtAnchor est un tableau de réflexion local pour Windows et Android. Conservez des fragments, organisez des cartes, dessinez, reliez des groupes réutilisables et composez un texte à partir de vos mots. Papier chaleureux, aquarelle et caractères à empattements sont communs aux appareils.

J'ai lancé ThoughtAnchor pour m'aider, ainsi que les personnes avec un TDAH, à organiser des pensées dispersées avec moins d'effort. Posez une idée lorsqu'elle arrive, puis reliez et classez les fragments quand vous en avez l'énergie. L'objectif est de dépenser moins de patience dans le rangement, de garder l'attention pour les idées et de faciliter l'entrée dans le flow. Capturez d'abord, réutilisez vos mots et annulez librement, à votre rythme.

Ce projet a été **entièrement construit par Codex**, selon les exigences et la direction du responsable : code, interface, tests, documentation et préparation des paquets. Les composants tiers gardent leurs licences. La [licence MIT](../../LICENSE) autorise l'utilisation, la modification, la redistribution et l'usage commercial sans autorisation préalable ; conservez les mentions de droit d'auteur et de licence. Le logiciel est fourni en l'état.

La première utilisation ouvre une page proposant huit langues, avec la langue système présélectionnée. Appuyez sur Commencer pour ouvrir le tableau ; le titre de l’exemple de promenade, ses trois cartes et le libellé du lien utilisent votre choix. La langue d’interface peut ensuite être modifiée dans les paramètres, sans réécrire les notes enregistrées. Cette page ne réapparaît pas lors d’une mise à jour pour les utilisateurs existants.

## Installation et utilisation

- Windows 10/11 x64 : installateur, EXE portable ou ZIP. Après extraction du ZIP, lancez `ThoughtAnchor.exe`. WebView2 Runtime et .NET Framework 4.8 sont nécessaires. Fermer la fenêtre laisse l'application dans la zone de notification ; quittez par son menu. Les exécutables Windows ne sont pas signés.
- Android 8.0 ou ultérieur : installez l'APK et mettez à jour le WebView système. Les téléphones utilisent l'interface mobile, les tablettes la disposition bureau. Ce choix se règle par appareil. Les paquets disponibles sont Windows et Android.
- Comparez le SHA-256 du téléchargement avec `SHA256SUMS.txt` dans la publication.

Dans la boîte de réception, Entrée enregistre et Maj+Entrée ajoute une ligne. Sous Windows, `Ctrl+Shift+Space` ouvre la capture rapide pendant que l'application fonctionne. Déplacez les cartes sur le tableau, reliez leurs quatre points et regroupez-les. Double-cliquez sur le texte pour le modifier. Ajoutez les cartes/groupes sélectionnés au texte et réorganisez-les.

Déplacement, sélection, crayon et gomme mémorisent l'outil précédent. Un double-clic ou double toucher sur le tableau y revient ; un autre rétablit l'outil actuel. Annuler/rétablir : `Ctrl+Z` / `Ctrl+Y` sous Windows. L'éditeur de dessin d'une carte conserve tout son texte, ajoute un espace libre en dessous et permet de régler largeur/hauteur. Enregistrer valide dessin et taille ensemble ; Annuler les abandonne. Le dessin direct sur les cartes est **désactivé par défaut** ; une fois activé, chaque trait est enregistré.

Sur téléphone, glissez vers la droite ou utilisez le bouton de navigation ; les paramètres sont en bas du panneau. La synchronisation LAN nécessite un réseau joignable commun et Windows en cours d'exécution. Scannez ou collez son code d'association sur Android. Les conflits hors ligne conservent deux tableaux. Les clés et réglages propres à l'appareil restent locaux. Exportez en `.thoughtanchor`, ou le texte/brouillon en Markdown ou texte brut. L'importation crée une copie. Sauvegardez régulièrement ; l'historique d'annulation dure une session.

## IA facultative et confidentialité

Le tableau ne nécessite aucune clé. Les paramètres proposent GLM, Kimi, Qwen, MiMo, MiniMax, Grok, Tencent Hunyuan et les fournisseurs existants. Choisissez le service, son URL de base, un modèle autorisé et sa clé. Les adresses, régions et réglages JSON figurent dans le [guide API](../providers.md). L'assemblage conserve les fragments exacts ; la révision produit un brouillon distinct. Les résultats restent des aperçus jusqu'à adoption et ne remplacent pas les cartes.

Seule une action IA explicite transmet le texte/brouillon nécessaire. Les clés sont chiffrées par DPAPI ou Android Keystore, sans export ni synchronisation. Il n'y a ni télémétrie ni synchronisation cloud hébergée. Les exports sont lisibles. [Sécurité](../../SECURITY.md) · [Limites de vérification](../verification.md). Aucun appel payant aux fournisseurs n'a été testé.

## Développement

Node.js 24 LTS ; environnement Windows indiqué ci-dessus. Android : JDK 21 et SDK 36, voir le [guide Android](../android-runtime.md).

```sh
npm ci
npm test
npm run security
npm run package
npm run build:android
```

Les fichiers sont dans `release/`. Conservez la clé privée de signature Android pour les mises à jour et ne la commitez jamais. Régressions avec données isolées : `npm run test:native` / `npm run test:android`. [Architecture](../native-runtime.md) · [Licences tierces](../third-party-notices.md).
