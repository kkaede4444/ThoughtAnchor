// Column order: zh-TW, en-US, ja-JP, ko-KR, fr-FR, de-DE, es-ES.
const rows = `
数据文件已被其他程序修改，请关闭其他实例后重新打开。|資料檔已被其他程式修改，請關閉其他實例後重新開啟。|Another app modified the data file. Close other instances and reopen.|別のアプリがデータを変更しました。他のインスタンスを閉じて再起動してください。|다른 프로그램이 데이터 파일을 수정했습니다. 다른 실행 창을 닫고 다시 여세요.|Un autre programme a modifié les données. Fermez les autres instances et rouvrez.|Ein anderes Programm hat die Daten geändert. Andere Instanzen schließen und neu öffnen.|Otra aplicación modificó los datos. Cierra las demás instancias y vuelve a abrir.
部分旧密钥无法解密，原文件已保留，请在设置中重新保存。|部分舊金鑰無法解密，原檔已保留，請在設定中重新儲存。|Some legacy keys could not be decrypted. Original files are preserved; save the keys again in Settings.|一部の旧キーを復号できませんでした。元ファイルは保存されています。設定で再保存してください。|일부 이전 키를 복호화할 수 없습니다. 원본은 보존되니 설정에서 다시 저장하세요.|Certaines anciennes clés n'ont pas pu être déchiffrées. Les originaux sont conservés ; réenregistrez les clés dans les paramètres.|Einige alte Schlüssel konnten nicht entschlüsselt werden. Originaldateien bleiben erhalten; Schlüssel erneut speichern.|No se pudieron descifrar algunas claves antiguas. Se conservaron los originales; guarda las claves de nuevo en Ajustes.
密钥文件无法读取，原文件已保留，请在设置中重新保存。|金鑰檔無法讀取，原檔已保留，請在設定中重新儲存。|The key file could not be read. The original is preserved; save the key again in Settings.|キーのファイルを読み取れません。元ファイルは保存されています。設定で再保存してください。|키 파일을 읽을 수 없습니다. 원본은 보존되니 설정에서 다시 저장하세요.|Le fichier des clés est illisible. L'original est conservé ; réenregistrez les clés dans les paramètres.|Schlüsseldatei nicht lesbar. Das Original bleibt erhalten; Schlüssel erneut speichern.|No se puede leer el archivo de claves. Se conservó el original; guarda la clave de nuevo en Ajustes.
删除卡片|刪除卡片|Delete card|カードを削除|카드 삭제|Supprimer la carte|Karte löschen|Eliminar tarjeta
删除卡片（可撤销）|刪除卡片（可復原）|Delete card (undo available)|カードを削除（元に戻せます）|카드 삭제 (실행 취소 가능)|Supprimer la carte (annulable)|Karte löschen (rückgängig möglich)|Eliminar tarjeta (se puede deshacer)
左键拖动空白处移动画布；双击空白处切换工具。|左鍵拖曳空白處移動畫布；按兩下空白處切換工具。|Drag empty space with the left button to pan; double-click empty space to switch tools.|空白を左ドラッグして移動。空白のダブルクリックでツール切替。|빈 곳을 왼쪽 버튼으로 드래그해 이동하고, 더블 클릭으로 도구를 전환하세요.|Faites glisser le fond avec le bouton gauche pour déplacer ; double-cliquez pour changer d'outil.|Leeren Bereich mit links ziehen zum Verschieben; doppelklicken zum Werkzeugwechsel.|Arrastra el fondo con el botón izquierdo para mover; haz doble clic para cambiar de herramienta.
左键拖动空白处框选卡片；双击空白处切换工具。|左鍵拖曳空白處框選卡片；按兩下空白處切換工具。|Drag empty space with the left button to box-select cards; double-click empty space to switch tools.|空白を左ドラッグして範囲選択。空白のダブルクリックでツール切替。|빈 곳을 왼쪽 버튼으로 드래그해 카드를 선택하고, 더블 클릭으로 도구를 전환하세요.|Faites glisser le fond avec le bouton gauche pour sélectionner ; double-cliquez pour changer d'outil.|Leeren Bereich mit links ziehen zur Bereichsauswahl; doppelklicken zum Werkzeugwechsel.|Arrastra el fondo con el botón izquierdo para seleccionar tarjetas; haz doble clic para cambiar de herramienta.
点击留下片段，或从收件盒放入。|點選留下片段，或從收件盒放入。|Click Add fragment, or place one from the inbox.|「断片を残す」をクリックするか、受信箱から置いてください。|조각 추가를 클릭하거나 수신함에서 가져오세요.|Cliquez sur Ajouter un fragment, ou placez-en un depuis la boîte.|Fragment hinzufügen anklicken oder aus dem Eingang ablegen.|Pulsa Añadir fragmento o coloca uno desde la bandeja.
双击文字编辑 · 双击空白切换工具 · 拖动卡片移动 · 点击圆点连线 · 右键增减选中|按兩下文字編輯 · 按兩下空白切換工具 · 拖曳卡片移動 · 點選圓點連線 · 右鍵增減選取|Double-click text to edit · Double-click background to switch tools · Drag cards · Click ports to connect · Right-click to toggle selection|文字をダブルクリックで編集 · 空白をダブルクリックでツール切替 · カードをドラッグ · 接続点をクリック · 右クリックで選択切替|텍스트 더블 클릭 편집 · 빈 곳 더블 클릭 도구 전환 · 카드 드래그 · 점 클릭 연결 · 오른쪽 클릭 선택 전환|Double-cliquez le texte pour éditer · Double-cliquez le fond pour changer d'outil · Glissez les cartes · Cliquez les points pour relier · Clic droit pour sélectionner|Text doppelklicken zum Bearbeiten · Hintergrund doppelklicken zum Werkzeugwechsel · Karten ziehen · Punkte verbinden · Rechtsklick zur Auswahl|Doble clic en texto para editar · Doble clic en fondo para cambiar herramienta · Arrastra tarjetas · Conecta puntos · Clic derecho para seleccionar
片段|片段|Fragment|断片|조각|Fragment|Fragment|Fragmento
连线|連線|Connection|接続|연결|Lien|Verbindung|Conexión
按 Enter 选中，方向键移动，Delete 删除，Esc 取消。|按 Enter 選取，方向鍵移動，Delete 刪除，Esc 取消。|Enter selects; arrows move; Delete removes; Esc clears.|Enter で選択、矢印で移動、Delete で削除、Esc で解除。|Enter 선택, 방향키 이동, Delete 삭제, Esc 해제.|Entrée sélectionne, flèches déplacent, Suppr supprime, Échap annule.|Enter wählt, Pfeile bewegen, Entf löscht, Esc hebt auf.|Enter selecciona, flechas mueven, Supr elimina, Esc cancela.
按 Enter 选中，Delete 删除，Esc 取消。|按 Enter 選取，Delete 刪除，Esc 取消。|Enter selects; Delete removes; Esc clears.|Enter で選択、Delete で削除、Esc で解除。|Enter 선택, Delete 삭제, Esc 해제.|Entrée sélectionne, Suppr supprime, Échap annule.|Enter wählt, Entf löscht, Esc hebt auf.|Enter selecciona, Supr elimina, Esc cancela.
片段位置：{0}，{1}|片段位置：{0}，{1}|Fragment position: {0}, {1}|断片の位置：{0}、{1}|조각 위치: {0}, {1}|Position du fragment : {0}, {1}|Fragmentposition: {0}, {1}|Posición del fragmento: {0}, {1}
按 Enter 选中连线，然后使用删除关系按钮。|按 Enter 選取連線，再使用刪除關係按鈕。|Press Enter to select the line, then use its remove button.|Enter で線を選択し、削除ボタンを使ってください。|Enter로 선을 선택한 뒤 삭제 버튼을 사용하세요.|Entrée sélectionne le lien, puis utilisez son bouton de suppression.|Enter wählt die Linie; dann den Löschknopf verwenden.|Enter selecciona la línea; después usa su botón de eliminar.
画布控制|畫布控制|Canvas controls|キャンバス操作|캔버스 제어|Contrôles du tableau|Canvas-Steuerung|Controles del tablero
画布概览|畫布概覽|Canvas overview|キャンバス概要|캔버스 개요|Vue du tableau|Canvas-Übersicht|Vista del tablero
重试美化|重試潤飾|Retry polish|推敲を再試行|다듬기 재시도|Réessayer la retouche|Überarbeitung erneut versuchen|Reintentar pulido
AI 接口|AI 介面|AI service|AI 接続|AI 서비스|Service IA|KI-Dienst|Servicio de IA
API 密钥|API 金鑰|API key|API キー|API 키|Clé API|API-Schlüssel|Clave API
OpenAI 兼容|相容 OpenAI|OpenAI compatible|OpenAI 互換|OpenAI 호환|Compatible OpenAI|OpenAI-kompatibel|Compatible con OpenAI
ThoughtAnchor · 思维拼图|ThoughtAnchor · 思維拼圖|ThoughtAnchor · Thinking board|ThoughtAnchor · 思考ボード|ThoughtAnchor · 생각 보드|ThoughtAnchor · Tableau de réflexion|ThoughtAnchor · Gedankenboard|ThoughtAnchor · Tablero de ideas
ThoughtAnchor · 留住闪念|ThoughtAnchor · 留住靈感|ThoughtAnchor · Capture a thought|ThoughtAnchor · ひらめきを保存|ThoughtAnchor · 생각 기록|ThoughtAnchor · Saisir une idée|ThoughtAnchor · Gedanken festhalten|ThoughtAnchor · Capturar una idea
ThoughtAnchor 思路纸|ThoughtAnchor 思路紙|ThoughtAnchor board|ThoughtAnchor ボード|ThoughtAnchor 보드|Tableau ThoughtAnchor|ThoughtAnchor-Board|Tablero ThoughtAnchor
ThoughtAnchor 无法启动|ThoughtAnchor 無法啟動|ThoughtAnchor cannot start|ThoughtAnchor を起動できません|ThoughtAnchor를 시작할 수 없습니다|Impossible de démarrer ThoughtAnchor|ThoughtAnchor kann nicht starten|No se puede iniciar ThoughtAnchor
{0}颜色|{0}顏色|{0} color|{0}の色|{0} 색상|Couleur {0}|Farbe {0}|Color {0}
{0}（导入）|{0}（匯入）|{0} (imported)|{0}（インポート）|{0} (가져옴)|{0} (importé)|{0} (importiert)|{0} (importado)
✓ 已留住|✓ 已保存|✓ Captured|✓ 保存済み|✓ 기록됨|✓ Enregistré|✓ Festgehalten|✓ Guardado
✳ 接上了|✳ 接上了|✳ Connected|✳ 接続済み|✳ 연결됨|✳ Relié|✳ Verbunden|✳ Conectado
一张新的思路纸|一張新的思路紙|A new thinking board|新しい思考ボード|새 생각 보드|Un nouveau tableau|Ein neues Gedankenboard|Un nuevo tablero
一条思路|一條思路|A line of thought|思考の流れ|생각의 흐름|Un fil de pensée|Ein Gedankengang|Un hilo de ideas
一篇文章的骨架|一篇文章的骨架|Article outline|文章の骨組み|글의 뼈대|Plan d'article|Artikelgliederung|Esquema del artículo
一组相关的想法|一組相關的想法|Related thoughts|関連する考え|관련된 생각|Idées liées|Verwandte Gedanken|Ideas relacionadas
下一小步|下一小步|Next small step|次の小さな一歩|다음 작은 단계|Prochaine petite étape|Nächster kleiner Schritt|Próximo pequeño paso
从想法走向行动|從想法走向行動|From thought to action|考えから行動へ|생각에서 행동으로|De l'idée à l'action|Vom Gedanken zum Handeln|De la idea a la acción
例子|例子|Example|例|예시|Exemple|Beispiel|Ejemplo
保存中…|儲存中…|Saving…|保存中…|저장 중…|Enregistrement…|Speichern…|Guardando…
保存设置|儲存設定|Save settings|設定を保存|설정 저장|Enregistrer les réglages|Einstellungen speichern|Guardar ajustes
借一个框架|借一個框架|Use a framework|枠組みを使う|틀 사용|Utiliser un cadre|Vorlage verwenden|Usar una estructura
先做哪一步|先做哪一步|First action|最初の一歩|첫 행동|Première action|Erster Schritt|Primera acción
先留下一点什么…|先留下一點什麼…|Leave a thought here…|まず何かを書いてみよう…|생각을 남겨 보세요…|Notez une idée…|Einen Gedanken festhalten…|Deja una idea aquí…
先留住这一片|先留住這一片|Capture this thought|このひらめきを保存|이 생각 기록|Saisir cette idée|Diesen Gedanken festhalten|Capturar esta idea
全部摊到这张纸上|全部攤到這張紙上|Place all on this board|すべてボードへ|모두 보드에 배치|Tout placer sur le tableau|Alles auf dem Board platzieren|Colocar todo en el tablero
关系名称|關係名稱|Relationship name|関係の名前|관계 이름|Nom du lien|Beziehungsname|Nombre de la relación
关闭设置|關閉設定|Close settings|設定を閉じる|설정 닫기|Fermer les réglages|Einstellungen schließen|Cerrar ajustes
减少动态效果|減少動態效果|Reduce motion|動きを減らす|동작 효과 줄이기|Réduire les animations|Animationen reduzieren|Reducir animaciones
切换画布交互|切換畫布互動|Toggle canvas interaction|キャンバス操作切替|캔버스 조작 전환|Changer l'interaction|Canvas-Interaktion umschalten|Cambiar interacción
删除当前已保存的密钥|刪除目前儲存的金鑰|Delete saved key|保存済みキーを削除|저장된 키 삭제|Supprimer la clé enregistrée|Gespeicherten Schlüssel löschen|Eliminar clave guardada
删除当前纸|刪除目前思路紙|Delete current board|現在のボードを削除|현재 보드 삭제|Supprimer ce tableau|Aktuelles Board löschen|Eliminar tablero actual
删除收件盒片段|刪除收件匣片段|Delete inbox fragment|受信箱の断片を削除|받은 생각 삭제|Supprimer le fragment|Inbox-Fragment löschen|Eliminar fragmento de entrada
删除选中片段（可撤销）|刪除所選片段（可復原）|Delete selection (undoable)|選択を削除（元に戻せます）|선택 삭제 (실행 취소 가능)|Supprimer la sélection (annulable)|Auswahl löschen (rückgängig möglich)|Eliminar selección (reversible)
协议|協定|Protocol|プロトコル|프로토콜|Protocole|Protokoll|Protocolo
厂商|供應商|Provider|プロバイダー|제공 업체|Fournisseur|Anbieter|Proveedor
双击编辑关系名称|連按兩下編輯關係名稱|Double-click to edit relationship|ダブルクリックで関係名を編集|두 번 클릭하여 관계 이름 편집|Double-cliquer pour modifier le lien|Doppelklick zum Bearbeiten der Beziehung|Doble clic para editar la relación
可能的解释|可能的解釋|Possible explanation|考えられる説明|가능한 설명|Explication possible|Mögliche Erklärung|Posible explicación
可选的路径|可選的路徑|Possible paths|選べる道筋|가능한 경로|Pistes possibles|Mögliche Wege|Posibles caminos
合成一组想法|合成一組想法|Group thoughts|考えをまとめる|생각 묶기|Regrouper les idées|Gedanken gruppieren|Agrupar ideas
启用接口 JSON 模式|啟用介面 JSON 模式|Enable JSON mode|JSON モードを有効化|JSON 모드 사용|Activer le mode JSON|JSON-Modus aktivieren|Activar modo JSON
回到上一步|回到上一步|Undone|前の状態に戻しました|실행 취소됨|Annulé|Rückgängig gemacht|Deshecho
在组合中上移|在群組中上移|Move up in group|グループ内で上へ|그룹에서 위로|Monter dans le groupe|In Gruppe nach oben|Subir en el grupo
在组合中下移|在群組中下移|Move down in group|グループ内で下へ|그룹에서 아래로|Descendre dans le groupe|In Gruppe nach unten|Bajar en el grupo
导入思路纸|匯入思路紙|Import board|ボードを読み込む|보드 가져오기|Importer un tableau|Board importieren|Importar tablero
导出思路纸|匯出思路紙|Export board|ボードを書き出す|보드 내보내기|Exporter le tableau|Board exportieren|Exportar tablero
导出成文|匯出文章|Export article|文章を書き出す|글 내보내기|Exporter l'article|Artikel exportieren|Exportar artículo
小步|小步|small steps|小さな一歩|작은 단계|petites étapes|kleine Schritte|pequeños pasos
展开组合|展開群組|Expand group|グループを展開|그룹 펼치기|Déplier le groupe|Gruppe aufklappen|Expandir grupo
已留在本机|已儲存在本機|Saved locally|ローカルに保存済み|로컬에 저장됨|Enregistré localement|Lokal gespeichert|Guardado localmente
已经有的线索|已經有的線索|Existing clues|既存の手がかり|이미 있는 단서|Indices existants|Vorhandene Hinweise|Pistas existentes
归组|分組|Group|グループ化|그룹화|Grouper|Gruppieren|Agrupar
当前接口密钥已删除|目前介面金鑰已刪除|Provider key deleted|接続先のキーを削除しました|서비스 키 삭제됨|Clé du fournisseur supprimée|Anbieterschlüssel gelöscht|Clave del proveedor eliminada
当前接口已保存密钥，留空保留|目前介面已儲存金鑰，留空保留|Key saved; leave blank to keep|保存済み。空欄で保持|저장된 키 유지하려면 비워 두세요|Clé enregistrée ; laisser vide pour conserver|Leer lassen, um den Schlüssel zu behalten|Dejar vacío para conservar la clave
快速捕捉内容|快速記錄內容|Quick capture text|クイック記録の内容|빠른 기록 내용|Texte de saisie rapide|Text der Schnellerfassung|Texto de captura rápida
快速捕捉快捷键|快速記錄快捷鍵|Quick capture shortcut|クイック記録のショートカット|빠른 기록 단축키|Raccourci de saisie rapide|Tastenkürzel für Schnellerfassung|Atajo de captura rápida
思路纸名称|思路紙名稱|Board name|ボード名|보드 이름|Nom du tableau|Boardname|Nombre del tablero
思路纸已导出|思路紙已匯出|Board exported|ボードを書き出しました|보드 내보냄|Tableau exporté|Board exportiert|Tablero exportado
想说的观点|想說的觀點|Main point|伝えたい主張|전하고 싶은 주장|Idée principale|Kernaussage|Idea principal
想达到什么|想達到什麼|Desired outcome|目指す結果|원하는 결과|Résultat visé|Gewünschtes Ergebnis|Resultado deseado
成文|成文|Article|文章|글|Article|Artikel|Artículo
我卡在哪里|我卡在哪裡|Where I am stuck|行き詰まっている点|막힌 부분|Mon point de blocage|Wo ich feststecke|Dónde me atasco
打开思路纸|開啟思路紙|Open board|ボードを開く|보드 열기|Ouvrir le tableau|Board öffnen|Abrir tablero
打开数据目录|開啟資料目錄|Open data folder|データフォルダーを開く|데이터 폴더 열기|Ouvrir le dossier des données|Datenordner öffnen|Abrir carpeta de datos
把困惑摊开|把困惑攤開|Explore a question|疑問を整理する|고민 펼쳐 보기|Explorer une question|Eine Frage erkunden|Explorar una pregunta
折叠组合|摺疊群組|Collapse group|グループを折りたたむ|그룹 접기|Replier le groupe|Gruppe zuklappen|Contraer grupo
拆出的片段|拆出的片段|Split fragments|分割した断片|분리된 조각|Fragments séparés|Geteilte Fragmente|Fragmentos separados
拆开|拆開|Ungroup|グループ解除|그룹 해제|Dégrouper|Gruppierung aufheben|Desagrupar
拼在它前面|接在它前面|Place before|前につなぐ|앞에 연결|Placer avant|Davor einfügen|Colocar antes
拼在它后面|接在它後面|Place after|後につなぐ|뒤에 연결|Placer après|Danach einfügen|Colocar después
拼接时轻轻发声|連接時播放輕音|Play a soft sound on joins|接続時に小さな音|연결 시 부드러운 소리|Son discret lors des liens|Leiser Ton beim Verbinden|Sonido suave al unir
按段拆分|按段拆分|Split paragraphs|段落ごとに分割|문단 나누기|Séparer les paragraphes|Absätze teilen|Dividir párrafos
按空行拆成片段|按空行拆成片段|Split at blank lines|空行で断片に分割|빈 줄로 조각 나누기|Séparer aux lignes vides|An Leerzeilen teilen|Dividir por líneas vacías
捕捉快捷键|記錄快捷鍵|Capture shortcut|記録ショートカット|기록 단축키|Raccourci de saisie|Erfassungskürzel|Atajo de captura
接口基础地址|介面基礎位址|API base URL|API ベース URL|API 기본 주소|URL de base de l'API|API-Basis-URL|URL base de la API
撤销 Ctrl+Z|復原 Ctrl+Z|Undo Ctrl+Z|元に戻す Ctrl+Z|실행 취소 Ctrl+Z|Annuler Ctrl+Z|Rückgängig Ctrl+Z|Deshacer Ctrl+Z
收件盒快速输入|收件匣快速輸入|Inbox quick input|受信箱に入力|받은 생각 빠른 입력|Saisie rapide|Schnelle Inbox-Eingabe|Entrada rápida
收束|收束|Conclusion|結び|마무리|Conclusion|Abschluss|Conclusión
放到纸上|放到紙上|Place on board|ボードに置く|보드에 놓기|Placer sur le tableau|Auf dem Board platzieren|Colocar en tablero
放大|放大|Zoom in|拡大|확대|Agrandir|Vergrößern|Acercar
放进「{0}」|放進「{0}」|Place in “{0}”|「{0}」に入れる|“{0}”에 넣기|Placer dans « {0} »|In „{0}“ platzieren|Colocar en «{0}»
新建思路纸|新增思路紙|New board|新規ボード|새 보드|Nouveau tableau|Neues Board|Nuevo tablero
无题片段|無題片段|Untitled fragment|無題の断片|제목 없는 조각|Fragment sans titre|Unbenanntes Fragment|Fragmento sin título
未命名思路纸|未命名思路紙|Untitled board|無題のボード|제목 없는 보드|Tableau sans titre|Unbenanntes Board|Tablero sin título
松手即拼接|放開即連接|Release to join|離して接続|놓아서 연결|Relâcher pour joindre|Loslassen zum Verbinden|Soltar para unir
查看全部片段|查看全部片段|Fit all fragments|すべて表示|모든 조각 보기|Afficher tous les fragments|Alle Fragmente anzeigen|Ver todos los fragmentos
框选工具|框選工具|Selection tool|範囲選択|선택 도구|Outil de sélection|Auswahlwerkzeug|Herramienta de selección
模型名称|模型名稱|Model name|モデル名|모델 이름|Nom du modèle|Modellname|Nombre del modelo
淡紫|淡紫|Lavender|ラベンダー|라벤더|Lavande|Lavendel|Lavanda
灰玫瑰|灰玫瑰|Dusty rose|ダスティローズ|더스티 로즈|Rose poudré|Altrosa|Rosa viejo
片|片|fragments|断片|조각|fragments|Fragmente|fragmentos
片想法 ·|片想法 ·| thoughts · |個の考え · |개 생각 · | idées · | Gedanken · | ideas ·
个板块 ·|個板塊 ·| groups · |個のグループ · |개 그룹 · | groupes · | Gruppen · | grupos ·
条联系|條連結| relationships|本の関係|개 관계| liens| Beziehungen| relaciones
片段内容|片段內容|Fragment text|断片の内容|조각 내용|Texte du fragment|Fragmenttext|Texto del fragmento
片段标题|片段標題|Fragment title|断片のタイトル|조각 제목|Titre du fragment|Fragmenttitel|Título del fragmento
现实约束|現實限制|Constraints|現実の制約|현실적 제약|Contraintes|Rahmenbedingungen|Limitaciones
理由|理由|Reason|理由|이유|Raison|Grund|Razón
界面及美化输出语言|介面及潤飾輸出語言|Interface and polish language|表示・推敲の出力言語|화면 및 다듬기 출력 언어|Langue de l'interface et de révision|Sprache der Oberfläche und Überarbeitung|Idioma de interfaz y revisión
留下一个片段|留下一個片段|Add a fragment|断片を追加|조각 추가|Ajouter un fragment|Fragment hinzufügen|Añadir fragmento
留住|留住|Capture|保存|기록|Saisir|Festhalten|Capturar
留到收件盒|留到收件匣|Save to inbox|受信箱に保存|받은 생각에 저장|Enregistrer dans la boîte|In Inbox speichern|Guardar en entrada
留在全局收件盒|留在全域收件匣|Saved in global inbox|共通受信箱に保存|공용 받은 생각에 저장|Dans la boîte globale|In der globalen Inbox|En la entrada global
留在本机|留在本機|Local storage|ローカル保存|로컬 저장|Stockage local|Lokaler Speicher|Almacenamiento local
相关|相關|Related|関連|관련|Lié|Verwandt|Relacionado
移出组合|移出群組|Detach from group|グループから外す|그룹에서 빼기|Retirer du groupe|Aus Gruppe lösen|Sacar del grupo
移动画布|移動畫布|Pan canvas|キャンバスを移動|캔버스 이동|Déplacer la vue|Ansicht verschieben|Mover lienzo
移除关系|移除關係|Delete relationship|関係を削除|관계 삭제|Supprimer le lien|Beziehung löschen|Eliminar relación
稍后|稍後|Later|後で|나중에|Plus tard|Später|Más tarde
纯文本|純文字|Plain text|プレーンテキスト|일반 텍스트|Texte brut|Klartext|Texto plano
组合名称|群組名稱|Group name|グループ名|그룹 이름|Nom du groupe|Gruppenname|Nombre del grupo
给这组想法起个名字|為這組想法命名|Name this group|このグループに名前を付ける|이 그룹의 이름|Nommer ce groupe|Diese Gruppe benennen|Nombrar este grupo
缩小|縮小|Zoom out|縮小|축소|Réduire|Verkleinern|Alejar
落笔中…|儲存中…|Saving…|保存中…|저장 중…|Enregistrement…|Speichern…|Guardando…
设置|設定|Settings|設定|설정|Réglages|Einstellungen|Ajustes
输入你的 API 密钥|輸入你的 API 金鑰|Enter your API key|API キーを入力|API 키 입력|Saisir votre clé API|API-Schlüssel eingeben|Introducir clave API
连一条「相关」关系|建立「相關」連結|Create a relationship|関係をつなぐ|관계 연결|Créer un lien|Beziehung erstellen|Crear relación
连接圆点|連接圓點|Connection point|接続点|연결점|Point de connexion|Verbindungspunkt|Punto de conexión
退出|結束|Quit|終了|종료|Quitter|Beenden|Salir
适合你的节奏|適合你的節奏|Your own pace|自分のペースで|나만의 리듬|À votre rythme|Im eigenen Tempo|A tu ritmo
重做 Ctrl+Y|重做 Ctrl+Y|Redo Ctrl+Y|やり直す Ctrl+Y|다시 실행 Ctrl+Y|Rétablir Ctrl+Y|Wiederholen Ctrl+Y|Rehacer Ctrl+Y
重命名当前纸|重新命名目前思路紙|Rename current board|現在のボード名を変更|현재 보드 이름 변경|Renommer ce tableau|Aktuelles Board umbenennen|Renombrar tablero actual
重新打开白板|重新開啟白板|Reopen board|ボードを再度開く|보드 다시 열기|Rouvrir le tableau|Board erneut öffnen|Volver a abrir tablero
闪念|靈感|Thoughts|ひらめき|생각|Idées|Gedanken|Ideas
闪念收件盒|靈感收件匣|Thought inbox|ひらめき受信箱|생각 받은함|Boîte à idées|Gedanken-Inbox|Bandeja de ideas
陶土|陶土|Clay|クレイ|점토|Argile|Ton|Arcilla
随时捕捉|隨時記錄|Capture anytime|いつでも記録|언제든 기록|Saisir à tout moment|Jederzeit erfassen|Capturar en cualquier momento
雾蓝|霧藍|Mist blue|ミストブルー|안개 파랑|Bleu brume|Nebelblau|Azul niebla
鼠尾草|鼠尾草|Sage|セージ|세이지|Sauge|Salbei|Salvia
慢慢成文|慢慢成文|Shape your article|文章を組み立てる|글 다듬기|Composer votre article|Artikel zusammenstellen|Dar forma al artículo
原片段保留，生成稿独立保存。|保留原片段，生成稿獨立儲存。|Original fragments stay intact; drafts are saved separately.|元の断片を保ち、原稿は別に保存します。|원본 조각은 유지하고 원고는 별도로 저장합니다.|Les fragments restent intacts ; les brouillons sont séparés.|Originalfragmente bleiben erhalten; Entwürfe werden separat gespeichert.|Los fragmentos se conservan; los borradores se guardan aparte.
加入选中|加入所選|Add selection|選択を追加|선택 추가|Ajouter la sélection|Auswahl hinzufügen|Añadir selección
加入全部板块|加入所有板塊|Add all blocks|すべて追加|모든 블록 추가|Ajouter tous les blocs|Alle Blöcke hinzufügen|Añadir todos los bloques
选中片段或组合，再点「加入选中」。|選取片段或群組，再按「加入所選」。|Select fragments or groups, then click Add selection.|断片やグループを選び、「選択を追加」を押してください。|조각이나 그룹을 고르고 선택 추가를 누르세요.|Sélectionnez des fragments ou groupes, puis ajoutez-les.|Fragmente oder Gruppen auswählen und hinzufügen.|Selecciona fragmentos o grupos y añádelos.
一片想法|一片想法|A thought|ひとつの考え|하나의 생각|Une idée|Ein Gedanke|Una idea
上移|上移|Move up|上へ|위로|Monter|Nach oben|Subir
下移|下移|Move down|下へ|아래로|Descendre|Nach unten|Bajar
移出成文|移出文章|Remove from article|文章から外す|글에서 빼기|Retirer de l'article|Aus Artikel entfernen|Quitar del artículo
（这个板块还空着）|（此板塊尚空）|(This block is empty)|（このブロックは空です）|(빈 블록)|（Bloc vide）|(Dieser Block ist leer)|(Este bloque está vacío)
AI 成文|AI 成文|AI writing|AI 文章作成|AI 글쓰기|Rédaction IA|KI-Schreiben|Redacción con IA
拼接|拼接|Assemble|つなぐ|이어 붙이기|Assembler|Zusammenfügen|Unir
美化|潤飾|Polish|推敲|다듬기|Réviser|Überarbeiten|Pulir
拼接＋美化|拼接＋潤飾|Assemble + polish|接続＋推敲|이어 붙이기＋다듬기|Assembler + réviser|Zusammenfügen + überarbeiten|Unir + pulir
允许 AI 重排|允許 AI 重新排序|Allow AI reordering|AI に並べ替えを許可|AI 순서 변경 허용|Autoriser le réordonnancement IA|KI darf neu ordnen|Permitir reordenación por IA
文学传统|文學傳統|Literary tradition|文学の伝統|문학 전통|Tradition littéraire|Literarische Tradition|Tradición literaria
自动跟随语言|自動依語言選擇|Follow language automatically|言語に合わせる|언어에 맞춰 자동 선택|Suivre la langue automatiquement|Automatisch der Sprache folgen|Seguir el idioma automáticamente
表达风格|表達風格|Expression style|表現スタイル|표현 스타일|Style d'expression|Ausdrucksstil|Estilo de expresión
自然随笔|自然隨筆|Natural essay|自然な随筆|자연스러운 수필|Essai naturel|Natürlicher Essay|Ensayo natural
克制抒情|克制抒情|Restrained lyricism|控えめな抒情|절제된 서정|Lyrisme discret|Zurückhaltende Lyrik|Lirismo contenido
叙事散文|敘事散文|Narrative prose|物語的な散文|서사적 산문|Prose narrative|Erzählende Prosa|Prosa narrativa
轻诗意|輕詩意|Gentle poetry|ほのかな詩情|은은한 시적 표현|Poésie légère|Leichte Poesie|Poesía sutil
自定义要求|自訂要求|Custom preferences|自由な要望|사용자 지정 요구|Préférences personnalisées|Eigene Vorgaben|Preferencias personalizadas
自定义|自訂|Custom|カスタム|사용자 지정|Personnalisé|Benutzerdefiniert|Personalizado
大陆中文现代文学|中國大陸現代文學|Mainland Chinese modern literature|中国大陸の現代文学|중국 본토 현대문학|Littérature moderne de Chine continentale|Moderne Literatur Chinas|Literatura moderna de China continental
台湾中文现代文学|臺灣現代文學|Taiwanese modern literature|台湾の現代文学|대만 현대문학|Littérature moderne taïwanaise|Moderne taiwanische Literatur|Literatura moderna taiwanesa
美国现代文学|美國現代文學|American modern literature|アメリカの現代文学|미국 현대문학|Littérature moderne américaine|Moderne amerikanische Literatur|Literatura moderna estadounidense
日本现代文学|日本現代文學|Japanese modern literature|日本の現代文学|일본 현대문학|Littérature moderne japonaise|Moderne japanische Literatur|Literatura moderna japonesa
韩国现代文学|韓國現代文學|Korean modern literature|韓国の現代文学|한국 현대문학|Littérature moderne coréenne|Moderne koreanische Literatur|Literatura moderna coreana
法国现代文学|法國現代文學|French modern literature|フランスの現代文学|프랑스 현대문학|Littérature moderne française|Moderne französische Literatur|Literatura moderna francesa
德国现代文学|德國現代文學|German modern literature|ドイツの現代文学|독일 현대문학|Littérature moderne allemande|Moderne deutsche Literatur|Literatura moderna alemana
西班牙现代文学|西班牙現代文學|Spanish modern literature|スペインの現代文学|스페인 현대문학|Littérature moderne espagnole|Moderne spanische Literatur|Literatura moderna española
仅发送成文区内容；美化使用当前稿件，输出语言跟随界面设置。|僅傳送成文區內容；潤飾使用目前稿件，輸出語言依介面設定。|Only article content is sent. Polish uses the current draft and interface language.|文章欄の内容のみ送信。推敲は現在の原稿を表示言語で出力します。|글 영역만 전송합니다. 현재 원고를 화면 언어로 다듬습니다.|Seul l'article est envoyé. La révision utilise le brouillon et la langue de l'interface.|Nur Artikelinhalte werden gesendet. Überarbeitung nutzt den aktuellen Entwurf und die Oberflächensprache.|Solo se envía el artículo. La revisión usa el borrador actual y el idioma de interfaz.
取消等待|取消等待|Cancel|キャンセル|취소|Annuler|Abbrechen|Cancelar
生成稿预览|生成稿預覽|Draft preview|原稿プレビュー|원고 미리 보기|Aperçu du brouillon|Entwurfsvorschau|Vista previa del borrador
采用稿件|採用稿件|Use draft|原稿を採用|원고 사용|Utiliser ce brouillon|Entwurf übernehmen|Usar borrador
放下这个建议|略過此建議|Dismiss|見送る|닫기|Écarter|Verwerfen|Descartar
当前成文稿|目前成文稿|Current draft|現在の原稿|현재 원고|Brouillon actuel|Aktueller Entwurf|Borrador actual
编辑成文稿|編輯成文稿|Edit draft|原稿を編集|원고 편집|Modifier le brouillon|Entwurf bearbeiten|Editar borrador
原文|原文|Original|原文|원문|Original|Original|Original
稿件|稿件|Draft|原稿|원고|Brouillon|Entwurf|Borrador
文章已导出|文章已匯出|Article exported|文章を書き出しました|글 내보냄|Article exporté|Artikel exportiert|Artículo exportado
成文稿已保存|成文稿已儲存|Draft saved|原稿を保存しました|원고 저장됨|Brouillon enregistré|Entwurf gespeichert|Borrador guardado
原片段已变化，当前稿件仍保留。|原片段已變更，目前稿件仍保留。|Source fragments changed; this draft is retained.|元の断片が変わりました。原稿は保持されています。|원본 조각이 바뀌었습니다. 원고는 유지됩니다.|Les sources ont changé ; ce brouillon est conservé.|Quellfragmente wurden geändert; der Entwurf bleibt erhalten.|Los fragmentos cambiaron; el borrador se conserva.
内容或生成选项已改变，请重新生成。|內容或生成選項已變更，請重新生成。|Content or options changed. Generate again.|内容や設定が変わりました。再生成してください。|내용이나 설정이 바뀌었습니다. 다시 생성하세요.|Le contenu ou les options ont changé. Régénérez.|Inhalt oder Optionen geändert. Bitte neu generieren.|El contenido o las opciones cambiaron. Genera de nuevo.
拼接已完成，美化失败或已取消。可以采用拼接稿或重新美化。|拼接完成，潤飾失敗或已取消。可採用拼接稿或重新潤飾。|Assembly finished; polish failed or was cancelled. Use the assembled draft or retry polish.|接続は完了しました。推敲が失敗または中止されました。接続稿を採用するか再試行してください。|이어 붙이기는 완료됐지만 다듬기가 실패하거나 취소됐습니다. 원고를 사용하거나 다시 다듬으세요.|Assemblage terminé ; révision échouée ou annulée. Utilisez le brouillon ou réessayez.|Zusammenfügen abgeschlossen; Überarbeitung fehlgeschlagen oder abgebrochen. Entwurf übernehmen oder erneut überarbeiten.|Unión completada; revisión fallida o cancelada. Usa el borrador o vuelve a pulirlo.
双击文字编辑 · 拖动卡片移动 · 点击圆点连线 · 左键拖动空白平移 · 右键增减选中|連按文字編輯 · 拖曳卡片移動 · 點圓點連線 · 左鍵拖曳空白移動畫布 · 右鍵增減選取|Double-click to edit · Drag cards · Click points to connect · Drag blank space to pan · Right-click to toggle selection|ダブルクリックで編集 · カードをドラッグ · 点をクリックして接続 · 空白をドラッグして移動 · 右クリックで選択切替|두 번 클릭해 편집 · 카드 끌기 · 점 클릭해 연결 · 빈 곳 끌어 이동 · 우클릭 선택 전환|Double-clic : modifier · Glisser : déplacer · Points : relier · Fond : déplacer la vue · Clic droit : sélectionner|Doppelklick: bearbeiten · Karten ziehen · Punkte verbinden · Leerfläche ziehen: verschieben · Rechtsklick: Auswahl|Doble clic: editar · Arrastrar tarjetas · Puntos: conectar · Fondo: mover · Clic derecho: seleccionar
Enter 留住并继续 · Shift+Enter 换行 · Esc 收起|Enter 儲存並繼續 · Shift+Enter 換行 · Esc 收起|Enter: save and continue · Shift+Enter: new line · Esc: hide|Enter: 保存 · Shift+Enter: 改行 · Esc: 閉じる|Enter: 저장 후 계속 · Shift+Enter: 줄바꿈 · Esc: 숨기기|Entrée : enregistrer · Maj+Entrée : nouvelle ligne · Échap : masquer|Enter: speichern · Shift+Enter: Zeilenumbruch · Esc: ausblenden|Enter: guardar · Mayús+Enter: nueva línea · Esc: ocultar
Enter 留住，Shift+Enter 换行|Enter 儲存，Shift+Enter 換行|Enter to save, Shift+Enter for a new line|Enter で保存、Shift+Enter で改行|Enter 저장, Shift+Enter 줄바꿈|Entrée pour enregistrer, Maj+Entrée pour un saut de ligne|Enter zum Speichern, Shift+Enter für neue Zeile|Enter para guardar, Mayús+Enter para nueva línea
一个词、一句话、几段文字…|一個詞、一句話、幾段文字…|A word, a sentence, a few paragraphs…|一語、一文、いくつかの段落…|단어, 문장, 몇 개의 문단…|Un mot, une phrase, quelques paragraphes…|Ein Wort, ein Satz, ein paar Absätze…|Una palabra, una frase, unos párrafos…
一张纸，等你的第一片想法|一張紙，等待你的第一片想法|A blank board awaits your first thought|最初の考えを待つ白紙|첫 생각을 기다리는 빈 보드|Un tableau attend votre première idée|Ein leeres Board wartet auf den ersten Gedanken|Un tablero espera tu primera idea
一整个板块，随时展开|完整板塊，隨時展開|A whole group, ready to expand|いつでも開けるグループ|언제든 펼칠 수 있는 그룹|Un groupe prêt à déplier|Eine Gruppe, jederzeit aufklappbar|Un grupo listo para expandir
不必想完整，先写下来。|不必想完整，先寫下來。|It need not be complete. Write it down.|まとまっていなくても、まず書いてみよう。|완벽하지 않아도 괜찮아요. 먼저 적으세요.|Pas besoin d'une idée complète. Notez-la.|Es muss nicht vollständig sein. Erst aufschreiben.|No hace falta completar la idea. Escríbela.
先让想法有地方待着。|先讓想法有地方待著。|Give your thoughts a place to stay.|まず考えの居場所を作ろう。|생각이 머물 곳을 마련하세요.|Donnez une place à vos idées.|Gedanken einen Platz geben.|Dale un lugar a tus ideas.
全局快捷键也能捕捉。|也可使用全域快捷鍵記錄。|Capture with the global shortcut too.|共通ショートカットでも記録できます。|전역 단축키로도 기록하세요.|Utilisez aussi le raccourci global.|Auch mit globalem Tastenkürzel erfassen.|También puedes usar el atajo global.
双击空白处，或从收件盒放入。|連按空白處，或從收件匣放入。|Double-click blank space or place a fragment from the inbox.|空白をダブルクリックするか受信箱から置いてください。|빈 곳을 두 번 클릭하거나 받은 생각에서 가져오세요.|Double-cliquez sur le fond ou ajoutez depuis la boîte.|Leerfläche doppelklicken oder aus Inbox platzieren.|Haz doble clic en el fondo o añade desde la entrada.
把片段拖到这里，接上这一小步|把片段拖到這裡，接上這一小步|Drag a fragment here to join this step|断片をここにドラッグ|조각을 여기로 끌어 놓으세요|Glissez un fragment ici|Ein Fragment hierher ziehen|Arrastra un fragmento aquí
散着也没关系，先留住，再靠近。|散著也沒關係，先留住，再靠近。|Scattered thoughts are welcome. Capture first, connect later.|散らばっていても大丈夫。保存してからつなごう。|흩어진 생각도 괜찮아요. 먼저 기록하고 연결하세요.|Les idées éparses ont leur place. Notez, puis reliez.|Gedanken dürfen verstreut sein. Erst erfassen, dann verbinden.|Las ideas dispersas también sirven. Captura y luego conecta.
框架只提供空位，你决定放什么。|框架只提供空位，由你決定內容。|The framework offers spaces; you choose what goes in.|枠組みの内容は自分で決められます。|틀은 빈칸만 제공합니다. 내용은 직접 정하세요.|Le cadre offre des espaces ; vous choisissez le contenu.|Die Vorlage bietet Platz; den Inhalt bestimmen Sie.|La estructura ofrece espacios; tú decides el contenido.
正在把片段之间的空隙想清楚…|正在整理片段之間的銜接…|Working on the connections…|つながりを考えています…|조각 사이 연결을 정리하는 중…|Recherche des liens…|Verbindungen werden ausgearbeitet…|Preparando las conexiones…
白板显示遇到问题，已保存的内容仍保留。|白板顯示遇到問題，已儲存的內容仍保留。|The board could not render. Saved content is retained.|表示に問題が発生しました。保存済みの内容は保持されています。|보드를 표시하지 못했습니다. 저장된 내용은 유지됩니다.|Affichage impossible. Le contenu enregistré est conservé.|Das Board konnte nicht angezeigt werden. Gespeicherte Inhalte bleiben erhalten.|No se pudo mostrar el tablero. El contenido guardado se conserva.
还没想好放哪，也可以先留下。|還沒決定放哪，也可先留下。|Capture it before deciding where it belongs.|置き場所は後で決めても大丈夫。|어디에 둘지 몰라도 먼저 기록하세요.|Notez avant de choisir sa place.|Erst festhalten, den Platz später wählen.|Guárdalo antes de decidir dónde va.
卡点 → 线索 → 解释 → 下一步|卡點 → 線索 → 解釋 → 下一步|Blocker → clues → explanation → next step|課題 → 手がかり → 説明 → 次の一歩|막힘 → 단서 → 설명 → 다음 단계|Blocage → indices → explication → étape suivante|Hindernis → Hinweise → Erklärung → nächster Schritt|Bloqueo → pistas → explicación → siguiente paso
观点 → 理由 → 例子 → 收束|觀點 → 理由 → 例子 → 收束|Point → reason → example → conclusion|主張 → 理由 → 例 → 結び|주장 → 이유 → 예시 → 마무리|Idée → raison → exemple → conclusion|Aussage → Grund → Beispiel → Abschluss|Idea → razón → ejemplo → conclusión
目标 → 路径 → 约束 → 行动|目標 → 路徑 → 限制 → 行動|Goal → path → constraints → action|目標 → 道筋 → 制約 → 行動|목표 → 경로 → 제약 → 행동|But → piste → contraintes → action|Ziel → Weg → Grenzen → Handlung|Objetivo → camino → límites → acción
默认 Ctrl + Shift + Space。支持如 Ctrl+Alt+N；软件在托盘中运行时也可使用。|預設 Ctrl + Shift + Space。也支援 Ctrl+Alt+N；程式在系統匣執行時可使用。|Default: Ctrl+Shift+Space. Alternatives such as Ctrl+Alt+N work while the app stays in the tray.|既定は Ctrl+Shift+Space。トレイ常駐中も使用できます。|기본값 Ctrl+Shift+Space. 트레이 실행 중에도 사용할 수 있습니다.|Par défaut : Ctrl+Maj+Espace. Fonctionne aussi depuis la zone de notification.|Standard: Ctrl+Shift+Space. Funktioniert auch im Infobereich.|Predeterminado: Ctrl+Mayús+Espacio. Funciona también desde la bandeja.
默认 DeepSeek；只在点击 AI 按钮时调用。支持三种接口协议与自定义服务。|預設 DeepSeek；僅按下 AI 按鈕時呼叫。支援三種協定及自訂服務。|DeepSeek by default. Requests run only on an AI button click. Three protocols and custom services are supported.|既定は DeepSeek。AI ボタンを押したときだけ接続します。3種類の方式とカスタム接続に対応。|기본 DeepSeek. AI 버튼을 눌러야 요청하며 세 프로토콜과 사용자 서비스 지원.|DeepSeek par défaut. Appels uniquement via les boutons IA. Trois protocoles et services personnalisés.|Standard ist DeepSeek. Aufruf nur per KI-Schaltfläche. Drei Protokolle und eigene Dienste.|DeepSeek por defecto. Solo se llama al pulsar IA. Tres protocolos y servicios personalizados.
密钥由 Windows 加密后保存在本机，不包含在思路纸导出中。更换接口地址后需为该地址单独保存密钥。|金鑰由 Windows 加密後儲存於本機，不含在匯出檔中。更換介面位址後需另存金鑰。|Windows encrypts keys locally. Exports exclude them. Save a separate key for each API address.|キーは Windows で暗号化しローカル保存。書き出しには含みません。接続先ごとに保存してください。|키는 Windows로 암호화해 로컬 저장하며 내보내기에 포함하지 않습니다. 주소마다 별도로 저장하세요.|Clés chiffrées localement par Windows, exclues des exports. Chaque adresse possède sa clé.|Schlüssel werden lokal von Windows verschlüsselt und nicht exportiert. Jede API-Adresse hat einen eigenen Schlüssel.|Windows cifra las claves localmente; no se exportan. Guarda una clave para cada dirección.
自动保存，保留两份最近备份。关闭主窗口后驻留托盘；在托盘菜单中退出。|自動儲存並保留兩份最近備份。關閉主視窗後常駐系統匣；由系統匣選單結束。|Autosaves with two recent backups. Closing the window keeps the app in the tray; quit from its menu.|自動保存し、直近2件をバックアップ。ウィンドウを閉じるとトレイに常駐。メニューから終了できます。|자동 저장 및 최근 백업 두 개 유지. 창을 닫아도 트레이에 남으며 메뉴에서 종료합니다.|Enregistrement automatique et deux sauvegardes. Fermer la fenêtre laisse l'app en notification ; quittez depuis son menu.|Automatisches Speichern mit zwei Sicherungen. Nach Fensterschließung im Infobereich; dort beenden.|Guardado automático con dos copias. Cerrar la ventana deja la app en la bandeja; sal desde su menú.
不兼容时可关闭，本地校验仍然有效。|不相容時可關閉，本機驗證仍有效。|Disable if unsupported; local validation remains active.|非対応なら無効化できます。ローカル検証は続きます。|호환되지 않으면 끄세요. 로컬 검증은 유지됩니다.|Désactivez si incompatible ; la validation locale reste active.|Bei Inkompatibilität deaktivieren; lokale Prüfung bleibt aktiv.|Desactiva si no es compatible; la validación local sigue activa.
`
const messages = `
接口返回 HTTP {0}。请检查地址、模型、密钥和额度。|介面回傳 HTTP {0}。請檢查位址、模型、金鑰及額度。|API returned HTTP {0}. Check URL, model, key and quota.|API が HTTP {0} を返しました。URL、モデル、キー、利用枠を確認してください。|API HTTP {0}. 주소, 모델, 키, 사용량을 확인하세요.|HTTP {0}. Vérifiez URL, modèle, clé et quota.|API meldet HTTP {0}. URL, Modell, Schlüssel und Kontingent prüfen.|HTTP {0}. Revisa URL, modelo, clave y cuota.
上次的文件不完整，已从最近的备份恢复。损坏文件已保留。|上次檔案不完整，已從最近備份還原，損壞檔案已保留。|Recovered from the latest backup; the damaged file was retained.|最新のバックアップから復元しました。破損ファイルは保持されています。|최근 백업에서 복구했습니다. 손상 파일은 보존했습니다.|Restauration depuis la dernière sauvegarde ; fichier endommagé conservé.|Letzte Sicherung wiederhergestellt; beschädigte Datei erhalten.|Restaurado desde la última copia; archivo dañado conservado.
不允许的请求来源。|不允許的請求來源。|Request origin is not allowed.|許可されていない送信元です。|허용되지 않은 요청 출처입니다.|Origine de requête non autorisée.|Unzulässige Anfragequelle.|Origen de solicitud no permitido.
不能把组合拼进它自己。|不能將群組加入自身。|A group cannot contain itself.|グループ自身を含めることはできません。|그룹에 자기 자신을 넣을 수 없습니다.|Un groupe ne peut se contenir lui-même.|Eine Gruppe kann sich nicht selbst enthalten.|Un grupo no puede contenerse a sí mismo.
两个想法有了联系|兩個想法已連結|Thoughts connected|考えをつなぎました|생각이 연결됐습니다|Idées reliées|Gedanken verbunden|Ideas conectadas
先到设置里保存这个接口的 API 密钥。|請先在設定中儲存此介面的 API 金鑰。|Save this provider's API key in settings first.|まず設定で接続先の API キーを保存してください。|먼저 설정에서 API 키를 저장하세요.|Enregistrez d'abord la clé API dans les réglages.|Zuerst den API-Schlüssel in den Einstellungen speichern.|Guarda primero la clave API en los ajustes.
先选中要组合的片段。|請先選取要分組的片段。|Select fragments to group first.|先にまとめる断片を選択してください。|그룹화할 조각을 먼저 선택하세요.|Sélectionnez les fragments à grouper.|Zuerst zu gruppierende Fragmente auswählen.|Selecciona primero los fragmentos a agrupar.
关系已被移除。|關係已移除。|Relationship deleted.|関係を削除しました。|관계가 삭제됐습니다.|Lien supprimé.|Beziehung gelöscht.|Relación eliminada.
关系的两端无效。|關係的兩端無效。|Invalid relationship endpoints.|関係の端点が無効です。|관계의 끝점이 잘못됐습니다.|Extrémités du lien invalides.|Ungültige Beziehungsendpunkte.|Extremos de relación inválidos.
写下一点内容再放入收件盒。|請先輸入內容再放入收件匣。|Write something before saving to the inbox.|受信箱に保存する内容を入力してください。|받은함에 저장할 내용을 입력하세요.|Écrivez avant d'enregistrer dans la boîte.|Vor dem Speichern etwas eingeben.|Escribe algo antes de guardar en la entrada.
几片想法成了一个板块|幾片想法已合為板塊|Fragments grouped|断片をまとめました|조각을 묶었습니다|Fragments regroupés|Fragmente gruppiert|Fragmentos agrupados
导入文件不能超过 30 MB。|匯入檔案不能超過 30 MB。|Import files must be under 30 MB.|読み込むファイルは30 MB以下にしてください。|가져올 파일은 30 MB 이하여야 합니다.|Fichier importé limité à 30 Mo.|Importdatei darf 30 MB nicht überschreiten.|El archivo importado no debe superar 30 MB.
工作台尚未加载。|工作區尚未載入。|Workspace has not loaded.|作業画面が読み込まれていません。|작업 공간이 아직 로드되지 않았습니다.|Espace de travail non chargé.|Arbeitsbereich noch nicht geladen.|El espacio de trabajo no se ha cargado.
已有请求进行中。|已有請求進行中。|A request is already running.|すでにリクエストが進行中です。|이미 요청이 진행 중입니다.|Une requête est déjà en cours.|Eine Anfrage läuft bereits.|Ya hay una solicitud en curso.
快捷键不可用或已被其他程序占用，请换一个组合。|快捷鍵無法使用或已被其他程式占用，請更換組合。|Shortcut unavailable or in use. Choose another combination.|ショートカットは使用できないか他のアプリが使用中です。変更してください。|단축키를 사용할 수 없거나 다른 앱이 사용 중입니다. 변경하세요.|Raccourci indisponible ou utilisé. Choisissez-en un autre.|Tastenkürzel nicht verfügbar oder belegt. Anderes wählen.|Atajo no disponible u ocupado. Elige otra combinación.
思路纸已移除，可撤销|思路紙已移除，可復原|Board removed; undo available|ボードを削除しました。元に戻せます|보드 삭제됨. 실행 취소 가능|Tableau supprimé ; annulation possible|Board entfernt; rückgängig möglich|Tablero eliminado; se puede deshacer
思路纸编号无效。|思路紙編號無效。|Invalid board ID.|ボード ID が無効です。|보드 ID가 잘못됐습니다.|Identifiant du tableau invalide.|Ungültige Board-ID.|ID de tablero inválido.
成文中包含已移除的片段。|文章含有已移除的片段。|Article includes deleted fragments.|文章に削除済みの断片が含まれています。|글에 삭제된 조각이 포함됐습니다.|L'article contient des fragments supprimés.|Artikel enthält gelöschte Fragmente.|El artículo contiene fragmentos eliminados.
成文中的片段被重复包含。|文章重複包含片段。|Article includes duplicate fragments.|文章に断片が重複しています。|글에 조각이 중복됐습니다.|Fragments dupliqués dans l'article.|Artikel enthält doppelte Fragmente.|Fragmentos duplicados en el artículo.
捕捉快捷键被占用，请在设置中修改。|記錄快捷鍵已被占用，請在設定中修改。|Capture shortcut is in use. Change it in settings.|記録ショートカットが使用中です。設定で変更してください。|기록 단축키가 사용 중입니다. 설정에서 변경하세요.|Raccourci utilisé. Modifiez-le dans les réglages.|Erfassungskürzel belegt. In Einstellungen ändern.|El atajo está ocupado. Cámbialo en ajustes.
操作失败。|操作失敗。|Operation failed.|操作に失敗しました。|작업이 실패했습니다.|Opération échouée.|Vorgang fehlgeschlagen.|Operación fallida.
收件盒编号重复。|收件匣編號重複。|Duplicate inbox IDs.|受信箱 ID が重複しています。|받은함 ID가 중복됐습니다.|Identifiants de boîte dupliqués.|Doppelte Inbox-IDs.|IDs de entrada duplicados.
文件中有重复的关系编号。|檔案含有重複關係編號。|Duplicate relationship IDs in file.|ファイルの関係 ID が重複しています。|파일의 관계 ID가 중복됐습니다.|Identifiants de liens dupliqués.|Doppelte Beziehungs-IDs in Datei.|IDs de relación duplicados en archivo.
文件中有重复的片段编号。|檔案含有重複片段編號。|Duplicate fragment IDs in file.|ファイルの断片 ID が重複しています。|파일의 조각 ID가 중복됐습니다.|Identifiants de fragments dupliqués.|Doppelte Fragment-IDs in Datei.|IDs de fragmento duplicados en archivo.
文字片段不能拥有子片段。|文字片段不能擁有子片段。|Text fragments cannot have children.|テキスト断片は子を持てません。|텍스트 조각에 하위 조각을 넣을 수 없습니다.|Un fragment texte ne peut avoir d'enfants.|Textfragmente können keine Kinder haben.|Un fragmento de texto no puede tener hijos.
无法解密密钥，请重新保存。|無法解密金鑰，請重新儲存。|Cannot decrypt the key. Save it again.|キーを復号できません。再保存してください。|키를 복호화할 수 없습니다. 다시 저장하세요.|Impossible de déchiffrer la clé. Enregistrez-la à nouveau.|Schlüssel nicht entschlüsselbar. Erneut speichern.|No se puede descifrar la clave. Guárdala de nuevo.
无法读取原文件和备份。原文件已保留，请打开数据目录检查。|無法讀取原檔及備份。原檔已保留，請開啟資料目錄檢查。|Cannot read the file or backups. Originals retained; inspect the data folder.|ファイルとバックアップを読めません。元ファイルを保持しました。データフォルダーを確認してください。|파일과 백업을 읽을 수 없습니다. 원본을 보존했습니다. 데이터 폴더를 확인하세요.|Fichier et sauvegardes illisibles. Originaux conservés ; vérifiez le dossier.|Datei und Sicherungen unlesbar. Originale erhalten; Datenordner prüfen.|Archivo y copias ilegibles. Originales conservados; revisa la carpeta.
板块拆开了，原文都在|板塊已拆開，原文保留|Group separated; original text preserved|グループを解除しました。原文は保持されています|그룹을 해제했습니다. 원문 유지|Groupe séparé ; texte original conservé|Gruppe aufgelöst; Originaltext erhalten|Grupo separado; texto original conservado
框架铺好了，慢慢往里放|框架已建立，可逐步加入內容|Framework ready for your thoughts|枠組みを用意しました|틀이 준비됐습니다|Cadre prêt pour vos idées|Vorlage ist bereit|Estructura lista para tus ideas
每一段有了自己的位置|每一段已有自己的位置|Paragraphs split into fragments|段落を断片に分けました|문단을 조각으로 나눴습니다|Paragraphes séparés en fragments|Absätze in Fragmente geteilt|Párrafos divididos en fragmentos
片段已移除，可撤销|片段已移除，可復原|Fragment removed; undo available|断片を削除しました。元に戻せます|조각 삭제됨. 실행 취소 가능|Fragment supprimé ; annulation possible|Fragment entfernt; rückgängig möglich|Fragmento eliminado; se puede deshacer
片段的组合归属无效。|片段的群組歸屬無效。|Invalid fragment group membership.|断片のグループ所属が無効です。|조각의 그룹 소속이 잘못됐습니다.|Appartenance du fragment invalide.|Ungültige Gruppenzugehörigkeit.|Pertenencia al grupo inválida.
留住闪念|留住靈感|Capture a thought|ひらめきを保存|생각 기록|Saisir une idée|Gedanken festhalten|Capturar una idea
系统密钥加密暂不可用。|系統金鑰加密暫時無法使用。|System key encryption is unavailable.|システムのキー暗号化が使用できません。|시스템 키 암호화를 사용할 수 없습니다.|Chiffrement système indisponible.|Systemverschlüsselung nicht verfügbar.|Cifrado del sistema no disponible.
系统密钥加密暂不可用，未保存密钥。|系統金鑰加密無法使用，未儲存金鑰。|System encryption unavailable; key not saved.|暗号化が使用できないためキーを保存しませんでした。|시스템 암호화를 사용할 수 없어 키를 저장하지 않았습니다.|Chiffrement indisponible ; clé non enregistrée.|Verschlüsselung nicht verfügbar; Schlüssel nicht gespeichert.|Cifrado no disponible; clave no guardada.
组合不能互相包含。|群組不能互相包含。|Groups cannot contain each other.|グループを循環させることはできません。|그룹이 서로 포함될 수 없습니다.|Les groupes ne peuvent se contenir mutuellement.|Gruppen dürfen sich nicht gegenseitig enthalten.|Los grupos no pueden contenerse mutuamente.
组合中有重复片段。|群組含有重複片段。|Duplicate fragments in group.|グループ内の断片が重複しています。|그룹에 조각이 중복됐습니다.|Fragments dupliqués dans le groupe.|Doppelte Fragmente in Gruppe.|Fragmentos duplicados en el grupo.
组合中的片段归属无效。|群組內片段的歸屬無效。|Invalid child membership in group.|グループ内の所属関係が無効です。|그룹의 하위 조각 소속이 잘못됐습니다.|Appartenance des enfants invalide.|Ungültige Kindzugehörigkeit in Gruppe.|Pertenencia de hijos inválida.
组合的文字应保存在子片段中。|群組文字應儲存於子片段。|Group text must live in its child fragments.|グループの文章は子断片に保存してください。|그룹의 텍스트는 하위 조각에 저장해야 합니다.|Le texte du groupe doit être dans ses fragments.|Gruppentext muss in Kindfragmenten gespeichert sein.|El texto del grupo debe estar en sus fragmentos hijos.
至少保留一张思路纸。|至少保留一張思路紙。|Keep at least one board.|少なくとも1枚のボードを残してください。|보드를 하나 이상 유지하세요.|Conservez au moins un tableau.|Mindestens ein Board behalten.|Conserva al menos un tablero.
设置已保存|設定已儲存|Settings saved|設定を保存しました|설정 저장됨|Réglages enregistrés|Einstellungen gespeichert|Ajustes guardados
请先拆开组合。|請先拆開群組。|Ungroup first.|先にグループを解除してください。|먼저 그룹을 해제하세요.|Dégroupez d'abord.|Zuerst Gruppierung aufheben.|Desagrupa primero.
请求已取消或超过 60 秒，内容未改变。|請求已取消或超過 60 秒，內容未變更。|Request cancelled or exceeded 60 seconds. Content unchanged.|中止または60秒を超過しました。内容は変わりません。|취소되거나 60초를 초과했습니다. 내용은 유지됩니다.|Requête annulée ou plus de 60 secondes. Contenu inchangé.|Anfrage abgebrochen oder über 60 Sekunden. Inhalt unverändert.|Solicitud cancelada o superior a 60 segundos. Contenido intacto.
输入格式不正确，操作没有应用。|輸入格式不正確，未套用操作。|Invalid input format; operation not applied.|入力形式が無効です。操作は適用されませんでした。|입력 형식이 잘못돼 작업을 적용하지 않았습니다.|Format invalide ; opération non appliquée.|Ungültiges Eingabeformat; Vorgang nicht angewendet.|Formato inválido; operación no aplicada.
过渡句重复。|銜接句重複。|Duplicate transition.|つなぎ文が重複しています。|연결 문장이 중복됐습니다.|Transition dupliquée.|Doppelter Übergang.|Transición duplicada.
还没有保存的成文稿。|尚無已儲存的成文稿。|No saved draft yet.|保存済みの原稿がありません。|저장된 원고가 없습니다.|Aucun brouillon enregistré.|Noch kein gespeicherter Entwurf.|Aún no hay borrador guardado.
这一片可以单独继续|此片段可獨立使用|Fragment detached|断片をグループから外しました|조각을 그룹에서 뺐습니다|Fragment détaché|Fragment abgelöst|Fragmento separado
这两个片段已经改变，请重新生成过渡句。|這兩個片段已變更，請重新生成銜接句。|These fragments changed. Generate a new transition.|断片が変わりました。つなぎ文を再生成してください。|조각이 바뀌었습니다. 연결 문장을 다시 생성하세요.|Fragments modifiés. Régénérez la transition.|Fragmente geändert. Übergang neu generieren.|Fragmentos modificados. Genera otra transición.
这个片段已经不存在。|此片段已不存在。|This fragment no longer exists.|この断片は存在しません。|이 조각은 더 이상 없습니다.|Ce fragment n'existe plus.|Dieses Fragment existiert nicht mehr.|Este fragmento ya no existe.
这张思路纸已经不存在。|此思路紙已不存在。|This board no longer exists.|このボードは存在しません。|이 보드는 더 이상 없습니다.|Ce tableau n'existe plus.|Dieses Board existiert nicht mehr.|Este tablero ya no existe.
这是一个文字片段。|這是文字片段。|This is a text fragment.|これはテキスト断片です。|텍스트 조각입니다.|C'est un fragment texte.|Dies ist ein Textfragment.|Este es un fragmento de texto.
这片想法落到了纸上|此想法已放到紙上|Thought placed on board|ボードに置きました|생각을 보드에 배치했습니다|Idée placée sur le tableau|Gedanke auf Board platziert|Idea colocada en el tablero
重新接上这一步|重新接上這一步|Redone|やり直しました|다시 실행됨|Rétabli|Wiederholt|Rehecho
铺开一张思路纸…|正在開啟思路紙…|Opening your board…|ボードを開いています…|보드를 여는 중…|Ouverture du tableau…|Board wird geöffnet…|Abriendo el tablero…
需要至少两段内容才能拆分。|至少需要兩段內容才能拆分。|At least two paragraphs are needed to split.|分割には2つ以上の段落が必要です。|나누려면 문단이 두 개 이상 필요합니다.|Deux paragraphes minimum pour séparer.|Zum Teilen sind mindestens zwei Absätze nötig.|Se necesitan al menos dos párrafos para dividir.
接口地址不能带用户名、密码、查询参数或锚点。|介面位址不能含帳密、查詢參數或錨點。|API URL cannot include credentials, query parameters or fragments.|API URL に認証情報、クエリ、フラグメントは使用できません。|API 주소에 인증 정보, 쿼리, 앵커를 넣을 수 없습니다.|URL API sans identifiants, paramètres ni fragment.|API-URL darf keine Zugangsdaten, Parameter oder Fragmente enthalten.|La URL no puede incluir credenciales, parámetros ni fragmentos.
远程接口请使用 HTTPS；本机服务可以使用 HTTP。|遠端介面請使用 HTTPS；本機服務可用 HTTP。|Use HTTPS remotely; local services may use HTTP.|リモートは HTTPS、ローカルは HTTP も使用可能です。|원격은 HTTPS, 로컬은 HTTP도 사용할 수 있습니다.|HTTPS à distance ; HTTP accepté en local.|Remote HTTPS verwenden; lokal ist HTTP erlaubt.|Usa HTTPS en remoto; HTTP se permite en local.
先把片段放进成文区。|請先把片段放入成文區。|Add fragments to the article first.|先に文章欄へ断片を追加してください。|먼저 글 영역에 조각을 추가하세요.|Ajoutez d'abord des fragments à l'article.|Zuerst Fragmente zum Artikel hinzufügen.|Añade primero fragmentos al artículo.
一次 AI 辅助最多处理 300 个板块。|每次 AI 最多處理 300 個板塊。|AI supports up to 300 blocks per request.|AI は1回に300ブロックまで対応します。|AI는 요청당 최대 300개 블록을 처리합니다.|300 blocs maximum par requête IA.|Maximal 300 Blöcke pro KI-Anfrage.|Máximo 300 bloques por solicitud de IA.
内容太长，请先在一张较小的思路纸上处理。|內容過長，請先在較小的思路紙處理。|Content too long. Use a smaller board.|内容が長すぎます。小さなボードで処理してください。|내용이 너무 깁니다. 더 작은 보드를 사용하세요.|Contenu trop long. Utilisez un tableau plus petit.|Inhalt zu lang. Kleineres Board verwenden.|Contenido demasiado largo. Usa un tablero menor.
AI 输出被截断，请减少板块数量。|AI 輸出遭截斷，請減少板塊數。|AI output truncated. Reduce the number of blocks.|AI 出力が途中で切れました。ブロックを減らしてください。|AI 출력이 잘렸습니다. 블록 수를 줄이세요.|Sortie IA tronquée. Réduisez les blocs.|KI-Ausgabe abgeschnitten. Weniger Blöcke verwenden.|Salida de IA truncada. Reduce los bloques.
接口没有返回可用的文字。|介面未回傳可用文字。|The API returned no usable text.|API から有効な文章が返されませんでした。|API가 사용 가능한 텍스트를 반환하지 않았습니다.|L'API n'a renvoyé aucun texte utilisable.|API lieferte keinen verwendbaren Text.|La API no devolvió texto utilizable.
AI 没有返回有效的 JSON，原片段未改变。|AI 未回傳有效 JSON，原片段未變更。|Invalid AI JSON; original fragments unchanged.|AI の JSON が無効です。元の断片は変わりません。|AI JSON이 잘못됐습니다. 원본은 유지됩니다.|JSON IA invalide ; fragments originaux intacts.|Ungültiges KI-JSON; Originalfragmente unverändert.|JSON de IA inválido; fragmentos originales intactos.
AI 排序没有完整保留所有板块，已拒绝。|AI 排序未完整保留所有板塊，已拒絕。|AI order did not preserve all blocks or the required order; rejected.|AI の並び順が条件を満たさないため拒否しました。|AI 순서가 모든 블록이나 순서 조건을 보존하지 않아 거부했습니다.|Ordre IA non conforme ; résultat rejeté.|KI-Reihenfolge unvollständig oder unzulässig; abgelehnt.|Orden de IA incompleto o no permitido; rechazado.
AI 的过渡句不符合相邻板块规则，已拒绝。|AI 銜接句不符合相鄰板塊規則，已拒絕。|AI transitions violate adjacency rules; rejected.|つなぎ文が隣接条件を満たさないため拒否しました。|연결 문장이 인접 규칙에 맞지 않아 거부했습니다.|Transitions IA non adjacentes ; rejetées.|KI-Übergänge verletzen Nachbarschaftsregeln; abgelehnt.|Transiciones de IA no adyacentes; rechazadas.
接口响应为空。|介面回應為空。|Empty API response.|API の応答が空です。|API 응답이 비어 있습니다.|Réponse API vide.|Leere API-Antwort.|Respuesta de API vacía.
接口响应过大，已停止读取。|介面回應過大，已停止讀取。|API response too large; stopped reading.|API 応答が大きすぎるため読み込みを中止しました。|API 응답이 너무 커 읽기를 중단했습니다.|Réponse API trop grande ; lecture arrêtée.|API-Antwort zu groß; Lesen gestoppt.|Respuesta de API demasiado grande; lectura detenida.
生成稿过长，请减少板块数量。|生成稿過長，請減少板塊數。|Draft too long. Reduce the number of blocks.|原稿が長すぎます。ブロックを減らしてください。|원고가 너무 깁니다. 블록 수를 줄이세요.|Brouillon trop long. Réduisez les blocs.|Entwurf zu lang. Weniger Blöcke verwenden.|Borrador demasiado largo. Reduce los bloques.
`
export const translations: Record<string, string[]> = Object.fromEntries(
  (rows + messages)
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((row) => {
      const [key, ...values] = row.split('|')
      if (values.length !== 7) throw new Error('Invalid translation row: ' + key)
      return [key, values]
    })
)
const aliases: Record<string, string> = {
  关系已移除: '关系已被移除。',
  '内容已改变，这次排序建议已失效。': '内容或生成选项已改变，请重新生成。',
  '内容已改变，这次过渡建议已失效。': '内容或生成选项已改变，请重新生成。',
  '等待期间内容已改变，请重新生成建议。': '内容或生成选项已改变，请重新生成。',
  往前接了一步: '拼在它前面',
  往后接了一步: '拼在它后面',
  '想到一点，就留一点。': '不必想完整，先写下来。',
  把所有闪念摊开了: '这片想法落到了纸上',
  拼上了一小步: '两个想法有了联系',
  '正在保存…': '保存中…',
  留下一片新的空间: '留下一个片段',
  留下片段: '留下一个片段',
  留住新的片段: '留下一个片段',
  这片想法已留住: '已留在本机',
  '先到设置里保存这个接口的 API 密钥。': '先到设置里保存这个接口的 API 密钥。',
  '先把至少两个片段放进成文区。': '先把片段放进成文区。',
  'AI 的过渡句不符合相邻板块或长度规则，已拒绝。': 'AI 的过渡句不符合相邻板块规则，已拒绝。'
}
for (const [key, target] of Object.entries(aliases)) translations[key] = translations[target]
