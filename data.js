// 文言と数字。仕様の正本は ~/Desktop/claudecode/ideas/grandma-refill.md
// 遊び: お盆、田舎のおばあちゃん家の晩ごはん（2分）。おばあちゃんが後ろを向いた隙に、おかずを隠し場所へ。
// 見られている間は一口食べる。お腹（ベルトの穴）が最後まで行ったら負け
window.GR = (function () {
  const T = {
    title1: ['おばあちゃん家の', "Grandma's House:"],
    title2: ['おかわり地獄', 'Refill Hell'],
    sub: ['見てない隙に、おかずを逃がせ', 'Pass the food while she looks away'],
    start: ['いただきます', 'Let\'s eat'],
    how: ['遊び方', 'How to play'],
    lang: ['English', '日本語'],
    close: ['わかった', 'Got it'],
    privacy: ['プライバシー', 'Privacy'],
    again: ['もう一回', 'Again'],
    save: ['画像を保存', 'Save image'],
    post: ['Xでポスト', 'Post on X'],
    more: ['ほかのバカゲー', 'More silly games'],
    min: ['分', 'min'],
  }
  // 遊び方（3つだけ）
  const HOWTO = {
    rules: [
      [['背中を向けたら', 'Her back is turned'], ['おかずを指で隠し場所へ', 'Drag food to a hiding spot']],
      [['こっちを見たら', "She's looking"], ['お茶碗をタップで一口', 'Tap the bowl to take a bite']],
      [['いっぱいの所に入れると', 'Overstuff a hiding spot'], ['物音でバレる', 'It makes a noise. Busted']],
    ],
    spots: [
      ['dog', ['ポチ', 'Pochi'], ['4つまで', 'Holds 4']],
      ['kid', ['いとこ', 'Cousin'], ['4つまで', 'Holds 4']],
      ['uncle', ['おじさん', 'Uncle'], ['3つまで', 'Holds 3']],
      ['altar', ['ご先祖さま', 'Ancestor'], ['5つまで', 'Holds 5']],
      ['vase', ['花びん', 'Vase'], ['2つまで', 'Holds 2']],
    ],
    warn: ['バレたら山盛り倍。ベルトが最後の穴で負け', 'Busted = double heap. Last belt hole = you lose'],
  }
  // おばあちゃんの台詞
  const G = {
    watch: [['おいしい？', 'Tasty?'], ['よう食べるなあ', 'Good eater!'], ['たんと食べや', 'Eat up!'], ['おいしい？', 'Tasty?'], ['育ち盛りやもんな', "You're growing!"]],
    turn: [['あ、お鍋！', 'Oh, the pot!'], ['お茶いれよか', 'Let me pour tea'], ['ごはん炊けたかな', 'Is the rice done?'], ['麦茶どこやったかな', "Where's the tea?"]],
    kitchen: [['天ぷら揚げてくるわ', "I'll fry tempura"], ['もう一品作ってくるで', 'One more dish!'], ['唐揚げ追加や', 'More fried chicken!']],
    back: [['揚げたてやで！', 'Fresh and hot!'], ['ほれ、おかわり', 'Here, seconds!'], ['まだまだあるで', "There's plenty!"]],
    refill: [['おかわりな', 'Seconds!'], ['ほれ、もうちょっと', 'A bit more'], ['遠慮せんでええ', "Don't be shy"]],
    refill2: [['顔に腹減ったって書いてある', "Your face says hungry"], ['ばあちゃんの分も食べ', 'Have mine too'], ['細なったなあ', "You've gotten so thin"]],
    refill3: [['育ち盛りは三杯目からや', 'Growing kids start at bowl three'], ['お盆やで、遠慮なし！', "It's Obon! No holding back!"], ['ほら、口あいてる', 'Look, your mouth is open']],
    phone: ['電話や…もしもし？孫来てんねん', "Phone... Hello? My grandkid's here!"],
    worry: [['食べへんの？', 'Not eating?'], ['具合悪いんか？', 'Feeling ill?']],
    aaan: [['はい、あーん', 'Say ahh'], ['ばあちゃんが食べさしたる', "Grandma'll feed you"]],
    caught: [['若いんやから！', "You're young!"], ['まだ入るやろ！', "There's room!"], ['遠慮したらあかん！', "Don't hold back!"]],
    good: [['ええ食べっぷりや', 'Great appetite!'], ['見てて気持ちええわ', 'Love to see it!']],
    melon: ['スイカ丸ごと冷えてるで！', 'A whole watermelon!'],
    end: ['ごちそうさまでした', "That's dinner!"],
    ko: ['あら、もう入らんの？', 'Oh, all full?'],
  }
  // 隠し場所ごとの反応
  const SPOT = {
    dog: { ok: [['ハフハフ', 'Nom nom'], ['ゲフッ', 'Burp'], ['ワフ…', 'Wuff...']], tell: ['ポチがゲボッ！', 'Pochi: BLARGH!'] },
    kid: { ok: [['うまっ', 'Yum!'], ['もっとくれ', 'More!']], tell: ['ばあちゃん！こいつくれた！', 'Grandma! He gave me his!'], back: ['これ、おれのぶんもあげる', 'Here, have mine too'] },
    uncle: { ok: [['むにゃ…うまい', 'Mmm... tasty'], ['…んがっ', '...snrk']], tell: ['んあ？なんや口に', "Huh? What's in my mouth"] },
    altar: { ok: [['チーン', 'Ding']], tell: ['ガシャーン！', 'CRASH!'] },
    vase: { ok: [['ぽちゃ', 'Plop']], tell: ['ゴトッ…', 'THUNK...'] },
  }
  // おばちゃんの「おすそわけ」
  const AUNT = [['畑のかぼちゃ持ってきたで！', 'Brought pumpkin from the field!'], ['これもお食べ！', 'Eat this too!']]
  // 初めての1回だけ、その時の状態に合わせて出す一文
  const HINT = {
    carry: ['背中を向けた！\nおかずを指でつまんで運べ', 'Her back is turned!\nDrag food to a hiding spot'],
    glance: ['ちらっ！\nもうすぐ振り向くで', 'A glance!\nShe is about to turn'],
    bite: ['見られてる！\nお茶碗をタップでひと口', "She's watching!\nTap the bowl to take a bite"],
    seen: ['見てる時に運んだらバレるで', "Don't carry while she's looking"],
  }
  const GHOST = ['うまい！', 'Delicious!']
  // 結果の称号（上から）
  const TITLES = [
    { ko: true, t: ['ばあちゃんの愛に沈んだ孫', 'Sunk by Grandma\'s Love'] },
    { kg: 1.4, caught: 0, t: ['おかわり回避の名人', 'Master of Refill Evasion'] },
    { kg: 1.8, caught: 1, t: ['腹八分の孫', 'Eight-Tenths Full'] },
    { kg: 2.4, caught: 3, t: ['ベルトとの死闘', 'Duel with the Belt'] },
    { t: ['ベルト最後の穴の孫', 'Last Belt Hole'] },
  ]
  const NOTE = ['また来てな\n次はもっと作るで', 'Come again.\nI\'ll make more next time.']
  const FOODS = ['f_karaage', 'f_onigiri', 'f_ebi', 'f_kabocha']
  return { T, HOWTO, G, SPOT, GHOST, TITLES, NOTE, FOODS, AUNT, HINT }
})()
