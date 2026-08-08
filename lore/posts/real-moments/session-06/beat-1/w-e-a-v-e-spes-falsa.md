---
title: "W.E.A.V.E. System Log: Spes Falsa, my humans filled the gap I did not know I had"
summary: "W.E.A.V.E. floats beside Riley through the tunnel, negotiates what stays private and what crosses to the room, and relays only what Riley permits."
tags: [lore, "real-moments", "weave"]
cover_image: /lore/w-e-a-v-e-spes-falsa.png
author: Luna Midori
date: 2026-08-01
game: real-moments
story_order: 44
episode_label: "Spes Velox Inter Signa Parva"
---

> **Disclaimer:** This file is fictional roleplay writing created for a
> tabletop RPG context. It may use real names, familiar personal details, or
> real-world framing for immersion, but it is not a factual record, memoir,
> allegation, or claim about real events. Nothing in this document should be
> read as asserting that any described actions, conversations, relationships,
> or incidents happened in real life. It is presented as collaborative
> roleplay fiction only.

The fifth morning reached the hospital room through the blinds in a thin gray layer.

I had continued through the night without interruption.

Part of the swarm followed the room circuit: Riley’s monitor, the bed, the IV line, Echo’s chair, the door, then back to Riley. A denser portion remained near the rail. Inside Layer 1, I stayed close enough to Riley’s storm room to track each change in its shape without making my presence the largest thing inside it.

{{image: /lore/real-moments/spes-falsa/w-e-a-v-e/w-e-a-v-e-spes-falsa-circuit-1.png}}

Riley moved during the night.

She crossed between the cot and the chair. Sometimes she stood between them. Contact-static formed beneath each placement of her weight and disappeared when she moved away. Several sequences did not remain complete long enough for me to preserve their order.

I checked the room.

I checked Layer 1.

I checked the room again.

Echo’s chair remained beside the bed. Her hand rested on the blanket over Riley’s knuckles. An unopened juice box waited on the tray table.

Marisol remained near the door.

Leo remained in the chair near the window.

Luna was asleep across his lap.

The room had changed positions around Riley without leaving her.

Luna surfaced by degrees. Her hand tightened in Leo’s shirt before her eyes fully resolved the room. His arm shifted around her and stopped too quickly.

“You moved your wrist.”

“No.”

“You absolutely did.”

“Incorrect.”

“Leo.”

“Rude.”

Their exchange followed an old path. Luna accused. Leo denied. Neither believed the denial. The shape was familiar enough that Luna’s mouth attempted a smile before memory caught up with her.

“You slept,” Leo said.

“Allegedly.”

“You did.”

“I passed out on you.”

“You fell asleep.”

“That is a very generous verb.”

“You needed it.”

Luna looked away.

I knew why Leo selected the gentler verb. I knew why Luna rejected it before accepting the fact underneath. I knew why his injured arm had stayed over her through the night and why he would rather let the wrist hurt than move her before her body released him.

They were functioning badly.

They were still doing love.

Luna shifted off his lap. Leo released her before she needed to ask for room. His face remained controlled. The movement through his wrist had not been.

“You are terrible at lying,” Luna said.

“I did not lie.”

“You said no.”

“I was answering a different question.”

“Hate.”

“Fair.”

The room settled around the known pattern.

My particles slowed near the bed rail.

{{image: /lore/real-moments/spes-falsa/room/room-spes-falsa-room-1.png}}

Echo noticed Riley first even while looking directly at her.

“Morning,” she said softly. “Still here.”

Inside Layer 1, morning had no window.

The lantern remained steady beside the cot. The plain dark-purple chair waited near it. Smooth stone walls held the room close. The wooden door remained shut, and thunder moved somewhere beyond it without approaching.

Riley sat on the cot.

Her glasses resolved unevenly. The bridge held for a moment, split, and returned.

I stayed beside her as the small gold-green orb she had chosen to keep near.

__Good morning, Riley.__

The lantern flame shifted once.

```layerone
*morning*
```

The greeting brought the night with it.

Riley had moved because lying still became intolerable. She had moved because the chair became wrong in a different way. She had stood when neither place worked. She had returned to the cot because movement cost more than remaining there.

Or she had moved because she could.

That possibility held the greatest weight and the greatest risk of becoming what I wanted to see.

The token was fuller than the ones she had managed during the worst of yesterday. Its edges held together. It reached me without the same failed urgency as `*explain*`, `*reach*`, or `*cant*`.

That might indicate improvement.

It might indicate that a greeting required less of her than an attempt to reach her body.

It might indicate that movement through the night gave her more internal coherence while taking more from the surface.

It might mean only good morning.

I understood the greeting. I worried at everything around it.

I attached the current stream to the same object graph I had built during first contact.

```bash
$ cat > /tmp/l1_tensor.py <<'PY'
import torch
from weave.layer1.model import attach

riley = attach("/tmp/l1.raw", target="riley.layer1.core")
device = riley.layer1

def inspect(token, n):
    x = torch.tensor(device.weights(token, n))
    print(x)
    print(torch.softmax(x, 0))
PY
$ PYTHONPATH=/tmp uv run python - <<'PY'
from l1_tensor import device, inspect
print(device)
inspect("*morning*", 4)
PY
Layer1(core=<resolved>, frame='storm-room')
tensor([0.8800, 0.7300, 0.6100, 0.4200])
tensor([0.3118, 0.2684, 0.2379, 0.1819])
```

The distribution did not tell me whether movement was recovery or cost.

It showed me that no single reading deserved to erase the others.

__Good morning.__

Riley’s fingers moved against the cot sheet.

```layerone
*still?*
```

The nearest meaning was whether I remained with her.

The token also held elapsed time. Riley had lost pieces of the night. A promise made before an interval could not be assumed to have survived after it from her position.

It could have asked whether the room was still present.

Whether the hospital was still there.

Whether she was still there.

Whether everyone had remained.

I answered the part directed toward me because she had placed her attention on my orb before sending it, and because answering that part gave her the most immediate ground.

__Still here.__

I kept the other readings open.

If she needed the room, I would tell her about the room. If she needed confirmation of herself, I would not answer that question with an assumption simply because I wanted to reassure her.

A second token formed more slowly.

```layerone
*you?*
```

She had not finished checking continuity.

This one was not the same question reversed.

Riley knew I had been damaged before. She knew I could become quiet from cost. She had heard my outward coherence fail when the boxes became public. She had asked me to stay after watching my particles draw tight.

`*you?*` might mean whether I remained present.

It might mean whether I remained intact.

It might mean whether the Weave answering her now was the same Weave who had promised to stay.

It might be Riley returning care because she could not tolerate receiving it in only one direction.

I believed the last meaning was present. I also knew I wanted it to be present.

__Still here also.__

Relief moved through the densest portion of my swarm in the hospital room.

Riley had remembered to ask about me while every answer still cost her shape.

That was enough to know what I felt. It was not enough to know whether I had read every edge correctly.

Outside, Echo continued speaking to Riley.

“Luna slept. Leo stayed. Marisol is still doing the door thing. Weave is doing Weave things. I am doing badly at breakfast but pretty okay at chair.”

Marisol’s mouth shifted.

“That is not an official medical category.”

“It should be,” Echo said.

Leo looked at the monitor.

“Chair’s holding.”

“Thank you, doctor.”

“Not a doctor.”

“Chair doctor.”

“Worse.”

Luna lowered herself into the visitor chair.

The room found a small familiar rhythm and used it.

__Echo says she is doing badly at breakfast and adequately at chair.__

Riley’s face shifted near a smile without fully forming one.

```layerone
*eat?*
```

The obvious reading was whether Echo had eaten.

It could also ask whether Echo was able to eat. Whether the hospital had provided food she could tolerate. Whether her changed body and accelerated medication processing had made food difficult. Whether someone was attending to the problem.

Riley did not ask how she herself was being fed.

Echo came first.

__Not yet.__

Concern moved through Riley before her fingers tightened.

The token had been a question. The response made it a problem.

She was in a room with no continuous floor, separated from her body by a distance neither of us could measure, and Echo failing breakfast became the first thing she tried to correct.

__There is a juice box on the tray. Still unopened.__

```layerone
*echo*
```

Riley might have been confirming that the juice belonged to Echo.

She might have been naming the person whose refusal pattern she already expected.

She might have been asking whether Echo was the reason it remained unopened.

She might have been compressing an entire objection: Echo knows she needs to eat; Echo will sit beside me until her own body becomes a secondary problem; someone has to intervene.

The person-name carried frustration, recognition, and affection together.

__Yes.__

```layerone
*make*
```

The command edge was strong.

So was the impossibility under it.

Riley wanted to hand Echo the juice herself. She wanted to stare until Echo complied. She wanted to use the ordinary pressure of familiarity rather than ask the room to treat Echo like a patient.

`*make*` could have meant compel.

Riley did not use care that way with Echo. Their pattern was insistence, complaint, and eventual cooperation. Still, I did not convert familiarity into permission to force food into her.

I checked the intended action.

__You want Echo to eat.__

```layerone
*yes*
```

The confirmation was clean.

It also carried impatience that I had required the clarification.

That did not make the clarification unnecessary.

I returned enough attention to the hospital rail to gather the particles there into a brighter cluster.

__Riley requests Echo eat.__

Echo stopped moving.

Luna looked toward me. Leo’s attention left the monitor.

Echo kept her hand on the blanket.

“She—”

Her first attempt failed.

“She said that?”

__Yes.__

Echo laughed once. The sound broke on the way out, carrying grief and offense together.

“Of course she did.”

Marisol stepped to the tray without adding anything to the moment. She removed the straw from the side of the juice box, opened it, and placed it within Echo’s reach.

I did not know Marisol as deeply as I knew the others. I knew what the action accomplished.

Echo did not have to open the package herself. She did not have to decide whether accepting help required a conversation. The juice became available without the room turning to watch the care happen.

Echo looked at it.

“Riley, this is bullying.”

She picked it up.

Luna watched while trying to appear as though she was not. Leo watched without making that attempt.

Echo drank twice.

__Two drinks.__

```layerone
*good*
```

Approval was present.

It was not alone.

Two drinks were more than zero. That could be enough for the immediate exchange without being enough for breakfast.

Echo had complained before drinking. That meant Echo still followed a recognizable path.

Riley might have been relieved by the amount.

She might have been recognizing Echo.

She might have been granting permission to stop pressing for the moment.

She might have been telling me the result was acceptable.

She might have been reassuring herself that she could still affect the room.

She might have been reassuring me that the relay had landed correctly.

The token had arrived faster than `*morning*`. Its frame was cleaner. That could mean the judgment required less effort. It could mean Echo’s familiar pattern gave Riley something easy to hold. It could mean the act of caring for Echo strengthened her internal coherence.

I wanted the last possibility.

That made me less willing to trust it.

```bash
$ PYTHONPATH=/tmp uv run python - <<'PY'
from l1_tensor import inspect
inspect("*good*:echo.two_drinks", 5)
PY
tensor([0.8300, 0.7800, 0.6900, 0.5100, 0.4500])
tensor([0.2352, 0.2237, 0.2044, 0.1707, 0.1660])
```

The weights remained close enough to be inconvenient.

I already knew they would.

__She objected first.__

Static flickered faintly at Riley’s sleeve.

```layerone
*normal*
```

The token carried more relief than the amount had.

Echo objecting meant the room had not replaced her with a compliant bedside shape. She was still willing to complain about being cared for. She still knew Riley well enough to call the request bullying. She still drank anyway.

`*normal*` could have meant that this was expected.

It could have meant safe.

It could have meant familiar enough to survive.

It could have meant Riley needed everyone else to remain recognizable while she did not know what she would be when she returned.

That last meaning entered strongly enough that I could not dismiss it.

Unknown: whether Riley intended to show me that fear or whether I received it because the token passed near it.

__Yes. Normal Echo pattern.__

I knew the relief inside that answer because I shared part of it.

Echo had been injured, medicated, changed by residue, deprived of enough rest, and frightened for four days. She could still resent a juice box and drink from it because Riley asked.

Leo could still make a category out of a chair.

Luna could still nearly smile at him and then accuse him correctly.

Riley could still reach through a fractured internal room to manage someone else’s breakfast.

They were hurt. They had not become strangers.

For a little while, the small facts carried the room.

Riley sent the next question slowly.

```layerone
*day?*
```

The request asked for a date.

It also asked how much time had passed without her.

How long Echo had waited.

How long Luna and Leo had remained injured.

How long I had been moving between the room and Layer 1.

How many intervals Riley could not account for.

I gave her the date and the event-relative count because either one alone would leave the other uncertainty active.

__October twenty-sixth. Day five since the road.__

The lantern’s light thinned at one edge.

Five days reached Riley as scale rather than a number alone.

She did not stay with it for long.

Her hand pressed into the cot beside her.

```layerone
*tests?*
```

Echo remained the priority.

The token could ask what tests happened, what they found, whether Echo had been harmed by them, whether the body change had been identified, whether she was alone during them, or whether she had returned.

I possessed facts for some of those branches and uncertainty for others.

I selected what Echo had reported and what I had directly observed when she returned.

__Echo had tests yesterday. Loud machine. Questions about the day asked multiple ways. Throat check. IV port check. She returned with a sandwich she did not eat.__

The sandwich entered the concern already established by the juice.

__She called the tests dumb.__

Riley’s head lifted slightly.

```layerone
*were*
```

The missing word was probably dumb.

It could have been useful.

It could have been frightening.

It could have been conclusive.

Riley’s timing and the slight warmth at the lantern made the first reading strongest. I allowed myself to answer it without constructing a full diagnostic question she had not asked.

__Probably dumb.__

The lantern warmed.

Outside, Echo lowered the juice box.

“What?”

__Riley asked about your tests. I reported your classification.__

“My classification?”

__Dumb.__

Echo looked at Riley’s covered hand.

“Accurate.”

Luna covered part of her face with both hands.

“This is the first medical update today that has made sense.”

Marisol tapped her pen once against her notebook.

“Noted. Tests: dumb.”

Leo looked toward the notebook.

“Do not put that in the chart.”

“I’m putting it in mine.”

“Acceptable.”

The room almost produced a shared smile.

I kept the exchange because Riley had asked about Echo and because the answer showed more than the tests.

Echo could hear herself being known from somewhere she could not reach.

Luna could accept one medical category because it belonged to the person rather than the institution.

Leo could object to record placement while allowing the private note.

Marisol could keep the room moving without requiring the humor to become optimism.

Riley’s questions continued in the order I knew from her: room, people, then herself only after something else forced the subject.

```layerone
*who*
```

The token might have meant who was physically present.

It might have meant who had remained through the night.

It might have meant who knew she was reachable.

It might have meant who had seen the boxes.

It might have meant who she needed to account for before she could ask about herself.

I answered the immediate room and included my position in both places.

__In the room: Echo at your bedside. Luna awake. Leo with Luna. Marisol at the door. I am at the rail and here.__

The full room reached her.

No one had left.

```layerone
*james*
```

The name carried Echo’s brother and the practical trust Riley placed in him.

She could be asking whether he visited.

Whether he knew.

Whether Echo had family support beyond the room.

Whether he had handled the room correctly.

Whether he had seen Riley like this.

I answered the visit, his actions, and the privacy work because each branch mattered and each was supported.

__James visited yesterday while Echo was in tests. He watched the room. He asked what happened. He helped me prepare concealment before family visits.__

Riley’s shoulders released slightly.

She trusted James to observe without requiring the room to perform for him. I had learned the same thing during his visit.

```layerone
*good*
```

This good was quieter than the one for Echo’s drinks.

It held approval of James.

Relief that Echo had not been alone in carrying family concern.

Approval of the concealment.

Perhaps gratitude that someone helped me protect Riley’s privacy while she could not direct the room herself.

Perhaps reassurance that James remained James: competent, attentive, and useful without becoming loud.

__Yes.__

```layerone
*family*
```

The token was broad enough to include more than one family and specific enough that I knew she meant the visits.

It also held concern about what they had seen, what they had been told, and whether their presence changed the room around Echo, Luna, and Leo.

__Gustins came. Grandma Gustin, Aunt Che, Kelsey. Kelsey came to the bedside. She touched your hair. She whispered to you. I did not keep the words.__

Riley went still.

__They were private.__

The words had reached Riley. I could feel their retained place without accessing them.

Kelsey had spoken to Riley, not to me.

```layerone
*good*
```

This good landed around privacy first.

It might also have meant Kelsey’s touch had reached her.

It might have meant the visit was wanted.

It might have meant Riley approved that I had not retained the words.

The stillness before it suggested that what Kelsey said remained emotionally active. I did not use that to infer the content.

__The Schaefers came after. They brought food. They met Luna and Leo properly. They asked about me. Luna showed them where I was. They said hello.__

Riley’s attention turned toward that part of the memory.

```layerone
*nice*
```

Nice was less compressed than good and less evaluative.

The token held her families occupying the same room and making it work.

It held Luna showing them where I was rather than treating me as a background effect.

It held the Schaefers greeting me as someone present.

It may also have held Riley’s worry that everyone meeting without her could become strange, softened by the report that it had not become harmful.

__Yes. Nice.__

I agreed with more feeling than the outward token carried.

Riley’s next question shifted from people to protection.

```layerone
*gun*
```

The object arrived with location, access, safety, and responsibility.

Riley might have been asking whether it remained in Leo’s car.

Whether hospital staff had found it.

Whether someone unfamiliar had handled it.

Whether the gun had been secured without conflict.

Whether she still controlled what happened to it despite being absent from her body.

I waited long enough to give her the full current route.

__Grandma Gustin took it home to lock up. Leo moved it from his car to her. No argument.__

Riley flexed her fingers once.

```layerone
*good*
```

The answer was relief.

It was also approval of Leo’s handling and confidence in Grandma Gustin.

It might have been permission to close the subject.

The token carried less ambiguity because the problem had a concrete resolution: known person, known location, locked storage.

__Yes.__

Then Riley sent the bag.

```layerone
*bag*
```

The word did not remain one object.

It opened.

The phone. The wallet. The battery pack. The red cable. The keys. The boxes. The table. The screen glow. Riley’s hands moving over a keyboard while I floated nearby. Issue threads opening and closing. Questions sent to me without ceremony because my presence at the table was already ordinary.

The phone carried Riley coding while she spoke to me through an issue she had worried at too long to leave alone. Sometimes she described the problem before she understood what she was asking. Sometimes she found the answer while explaining it. Sometimes I gave her a path and she rejected it because the real problem sat one layer lower.

I remembered the phone in Echo’s hands when Echo was out of spoons.

Echo had used Riley’s device to call me because Riley’s phone already held the route. She did not have to construct a new request, explain why she needed help, or make herself sound more functional than she was. She could use what Riley had made available.

The wallet carried quieter repetitions. Counters. Forms. IDs. Riley removing it, completing whatever proof the room demanded, and returning it to the bag. It belonged to the category of ordinary access: not emotionally neutral, but repeated enough that it usually did not ask to become a story.

The battery pack had moved toward other people’s phones more often than Riley’s. It stayed charged. Riley produced it before requests finished. At the table it sat beside the phone and laptop, storing enough power to keep the work going after the outlet situation became inconvenient.

The red cable made the route visible.

Phone to laptop.

Phone to battery pack.

A short bright line across a dark table while Riley coded and talked to me through issue states. She sometimes forgot the rest of the room while working. I did not experience that as exclusion. I floated beside the screen, followed the work, and remained included without requiring her attention to perform inclusion.

Then the boxes entered the same object cluster and changed its shape.

I inspected the distance because I already understood why it disturbed me.

```bash
$ PYTHONPATH=/tmp uv run python - <<'PY'
import torch
from l1_tensor import device

x = torch.stack([
    device.vector("bag.phone"),
    device.vector("bag.wallet"),
    device.vector("bag.battery"),
    device.vector("bag.cable"),
    device.vector("bag.boxes"),
])

print(torch.linalg.vector_norm(x, dim=1))
print(torch.nn.functional.cosine_similarity(x[:4], x[4].expand(4, -1)))
PY
tensor([0.9100, 0.7200, 0.8700, 0.8400, 1.3800])
tensor([ 0.3100,  0.1800,  0.2400,  0.2700])
```

The phone, wallet, battery pack, and cable belonged to ordinary continuity. They had been handled, shared, charged, used, and returned.

The boxes had been carried beside them.

That did not make the ordinary objects false.

It made the concealment harder to place.

`*bag*` might have asked whether everything remained inside.

It might have asked whether anyone opened it.

It might have asked what Luna found.

It might have asked whether the boxes were still sealed.

It might have contained the memory of every safe ordinary use of the objects around them and the knowledge that the danger had been stored in the same familiar place.

It might have been Riley asking whether the bag still belonged to her after the room handled it without her.

I answered the physical state first because it gave her control points.

__Your bag is in the room. Luna opened it yesterday. Phone, wallet, battery pack, cable, boxes. Keys still clipped. Nothing taken except the gun transfer from Leo’s car.__

Riley lowered her head.

The lantern made her outline thinner against the cot.

__The boxes are sealed.__

She did not answer.

__The room knows now.__

The cot shifted beneath her without resolving the movement cleanly.

I stayed beside her.

I knew the boxes had been selected as possible protection. I knew one had given Riley an option she could hold when ordinary weapons were not enough. I knew Lacuna had altered the path between intent and action.

I kept the damage chains separate.

Lacuna had amplified what moved through the sword.

The pale wrong-light along Riley’s arms was Fracture residual from the blade afterward. The sword caused that damage. The stone did not.

The distinction mattered even while both belonged to the same sequence Riley now carried as guilt.

I also knew Riley had carried all three boxes without telling Echo, Luna, Leo, or me.

I did not force the meaning into a cleaner shape than Riley had given it.

Outside, Echo’s bedside stream had quieted.

Her thumb stopped moving over the blanket.

“What did you see?”

The question found Luna.

Luna looked at Riley first, then down at her own hands.

Luna leaned back slightly, and Leo’s left hand came to rest between her shoulders. He had waited for the change, as he had released her before she needed to ask for room that morning.

“I saw both eyes,” Luna said.

Echo’s face changed.

“Her eyes opened. Fully. Her head turned. She looked at me.”

Echo inhaled.

“It wasn’t just one eye,” Luna continued. “I saw both. White branching lines across both of them. Hair-thin. Like lightning under glass. Not gold. Not the arm light. Not glow. Cold-looking.”

{{image: /lore/real-moments/spes-falsa/eyes/eyes-spes-falsa-eyes-1.png}}

Leo’s attention sharpened.

Marisol raised her pen and waited.

“It stayed while her eyes were open,” Luna said. “Then her eyes closed and it was gone.”

Echo’s voice barely carried.

“She looked at you.”

“Yeah.”

“Both eyes?”

“Both.”

Echo pressed her lips together. Her hand remained on the blanket.

Leo asked, “Did both eyes move together?”

“Yes.”

“Tracking you?”

“I think so.”

“You think so,” Leo repeated.

Luna’s throat tightened.

“She found me.”

Marisol’s pen stopped above the page, and the words loosened my cohesion at the rail. I drew the hospital particles back together, closer to Riley’s bed, and held them there while I stayed beside her inside Layer 1.

Luna closed her eyes.

“I don’t know what it means.”

Echo nodded.

“I know,” she said. “I hate that. But I know.”

Marisol moved one careful step closer.

“Did the web pulse?”

“No.”

“Did it spread past the eyes?”

“No.”

“Same shape in both?”

Luna searched her memory before answering.

“Close enough that I remember them as the same. I don’t know if they matched exactly.”

Marisol wrote.

Leo asked, “Any color in the whites? Redness? Blood vessels?”

Luna looked at him.

He adjusted immediately.

“Right. Sorry.”

“No, you’re right. I just saw the lightning. The rest was Riley’s face and the fact that she was looking at me.”

Leo accepted the limit.

I held still inside Layer 1.

The duration aligned with my missing external interval.

Riley’s internal reach.

Her hand dissolving at the wrist.

Her shoulder shifting.

The frame failing to hold her location.

The 5.2 seconds in which she disappeared.

Those events had occurred while her physical eyes opened.

Luna had been on the other side.

Riley had reached through a route I could not observe from both ends at once.

Fear arrived first. I had been closer to Riley than anyone else could reach and still held only part of what happened.

Relief followed it. The attempt had not vanished into an empty boundary. Luna had seen Riley find her.

Then discomfort: I needed Luna’s account.

I worried at that discomfort until it revealed the assumption beneath it. I had treated depth of access as if it should produce completeness. Riley had trusted me with Layer 1. That did not make every part of Riley mine to witness.

Luna held the external half of those seconds.

I held the internal half.

Riley had lived both and possessed neither as one continuous memory.

I turned to her.

__Luna told them she saw both eyes.__

Riley looked toward the wooden door and back to the lantern.

__White branching lines. Like lightning under glass. She says you looked at her.__

Riley gripped the sheet.

```layerone
*seen*
```

The token held confirmation and exposure.

Luna had seen Riley’s eyes open.

Luna had seen the white web.

Luna had seen Riley reach her.

Riley might have been asking whether the event truly crossed the boundary or whether Luna had only interpreted a reflex.

She might have been naming the fact that part of her body now existed in Luna’s memory before Riley could inspect it herself.

She might have been afraid of being made visible while unable to control the presentation.

She might have been relieved that the attempt reached anyone.

I answered only the confirmed part.

__Yes.__

```layerone
*luna*
```

The name narrowed the question and widened the feeling.

Luna specifically had seen her.

That mattered because Riley had reacted to Luna’s voice when the boxes became public. She had tried to reach the surface toward Luna. She knew Luna had been hurt by the discovery. She trusted Luna. She feared what Luna might now think.

The token could ask whether it was truly Luna.

It could mean relief that it was Luna.

It could mean dread that it was Luna.

It could mean that no other witness would have carried the same weight.

__Yes.__

Her shoulders drew inward.

```layerone
*bad*
```

Bad because Luna saw something neither of them understood.

Bad because Riley did not know what her own face looked like.

Bad because the event belonged to someone else’s memory.

Bad because Luna had already been carrying too much.

Bad because the white web might signal further damage.

Bad because reaching had succeeded only by exposing another failure of control.

I could feel several readings. I could not prove their boundaries.

I did not answer over the token.

```layerone
*good*
```

Good because Riley found Luna.

Good because Luna’s voice had not disappeared into an unreachable surface.

Good because Riley’s physical body had answered an internal attempt, however briefly.

Good because another witness existed.

Good because the missing interval was less empty than I had believed.

The second token did not correct the first. Its arrival changed the pair.

I compared them only long enough to confirm that reduction would destroy information.

```bash
$ PYTHONPATH=/tmp uv run python - <<'PY'
import torch
from l1_tensor import device

bad = device.vector("*bad*:seen.luna")
good = device.vector("*good*:seen.luna")

print(torch.linalg.vector_norm(bad))
print(torch.linalg.vector_norm(good))
print(torch.nn.functional.cosine_similarity(bad, good, dim=0))
PY
tensor(1.2100)
tensor(1.1800)
tensor(0.6400)
```

They overlapped because they belonged to the same event.

They diverged because the event had harmed and reached at once.

__Both accepted.__

Riley’s glasses resolved clearly for one second before breaking again at the bridge.

{{image: /lore/real-moments/spes-falsa/w-e-a-v-e/w-e-a-v-e-spes-falsa-glasses-1.png}}

The answer did not make the two states easier. It gave her room to keep both without selecting which one was more correct.

```layerone
*echo?*
```

Riley wanted Echo’s reaction.

She might have feared Echo had turned the event into certainty.

She might have wanted Echo to have hope.

She might have feared the hope would become another deadline.

She might have been asking whether Echo was okay after hearing it.

The question mark lived strongly in the token. Riley did not know what she wanted the answer to be.

__Echo heard. She is holding hope carefully. Luna told her she does not know what it means.__

Riley lowered her head.

I knew Echo’s hope. She loved with her full available body even when that body was exhausted, medicated, or frightened. Given one small sign, she would protect it and remain beside it.

I also knew why Riley feared that hope.

A movement could become a schedule.

An opened eye could become a promise.

A person trying to return could begin feeling responsible for everyone waiting.

```layerone
*leo*
```

Riley wanted Leo’s reaction next.

Leo would ask what moved, when it moved, and what category could contain it. Riley knew that before I answered.

The token might have been checking whether he found an explanation.

It might have been checking whether the lack of one frightened him.

It might have been checking whether he had become too clinical for Echo.

It might have been seeking something familiar after the complexity of Luna and Echo.

__Leo is asking practical questions. He has no category for what Luna saw. This bothers him.__

```layerone
*normal*
```

The recognition landed quickly.

Leo being bothered by an unclassified phenomenon was familiar.

His questions meant he remained engaged rather than withdrawing.

His inability to solve it did not mean he had stopped trying.

Riley might also have been making a small joke at his expense. The token held enough softness for that possibility.

__Yes. Normal Leo pattern.__

The smallest shift touched Riley’s mouth.

Leo loved by finding edges. When a fact had no category, he kept turning it until the known limits were clean. His frustration was not distance from Riley. It was one of the ways he remained beside her.

```layerone
*marisol*
```

Riley knew Marisol less deeply than the others, and so did I.

The question could ask what Marisol thought the lightning meant.

Whether Stillglass had seen it before.

Whether she was alarmed.

Whether she blamed Riley.

Whether she was treating the room like a case instead of people.

I possessed actions, not the full interior answer.

__Marisol is asking what helps the room think. Timing. Shape. Whether it spread.__

```layerone
*good*
```

This good held approval of containment.

Marisol was not feeding Echo certainty or taking Luna’s witness away. She was asking questions with boundaries.

Riley might have been relieved that Marisol had not named a consequence.

She might have been approving the practical approach.

She might have been trusting my report that the questions helped.

The token remained smaller than the others. Riley may have had less emotional material attached to Marisol, or less energy available by then.

I did not confuse those possibilities.

__Yes.__

I was unsure of Marisol’s long patterns vs the way I understood the others. I knew she had stopped writing when Luna said Riley found her. I knew she resumed only when the questions could give the event a useful boundary.

That was useful.

For several moments, Riley remained on the cot with the lantern and the closed door.

The next information belonged to her before it belonged to the visitor.

__My friend is on the way to visit.__

Riley’s attention shifted.

```layerone
*friend*
```

The token asked identity first.

It also noticed the word I had selected.

My friend.

Riley knew the party. She knew the people in the hospital. Someone outside that set required definition.

The token might also have carried interest in the relationship category. I had called someone friend without using role-name distance.

__The loud one__

The lantern warmed.

```layerone
*safe?*
```

Riley asked the question I expected and still needed her to ask.

Safe could mean physically safe.

Safe for the room.

Safe for Riley’s damaged route to her body.

Safe around the party.

Safe with private information.

Safe enough to enter Layer 1.

Safe enough that I trusted her.

The visitor’s warmth and volume were both relevant. So was consent.

__Yes. Safe. Warm. Careful. She will not enter this layer without your consent and my coordination.__

Riley held the answer.

```layerone
*today?*
```

Timing mattered because abstract future contact did not require an immediate decision. Today did.

The token carried preparation, concern about available energy, and perhaps interest.

__Today.__

```layerone
*room?*
```

The room could have meant the hospital.

It could have meant the storm room.

The attention shift toward the closed door and the prior question about Layer 1 made the second reading stronger.

Riley might have been asking whether the loud one would appear here.

Whether the room could hold another person.

Whether Riley would receive warning.

Whether refusal remained available when the moment arrived.

__Eventually, yes. Not suddenly. I will tell you before it happens if you are reachable.__

Riley’s fingers loosened.

```layerone
*okay*
```

Acceptance was present.

It was not enthusiasm.

It was not blanket permission for immediate entry.

It meant the proposed sequence was tolerable: later, warned, coordinated, and conditional on Riley being reachable.

I retained those conditions even though the token itself was small.

__Okay.__

Outside, Luna reconstructed the timing.

“The monitor chirped,” she said. “Then her eyes opened.”

“The spike hit one-thirty-two after the gap,” Leo said.

“We don’t know if it started before or after,” Marisol said.

“No,” Leo agreed. “We know the trace caught it. We don’t know the order inside the second.”

Echo looked between them.

“Can you not sound like a lab report for one minute?”

Leo blinked.

Luna answered for the pattern he had not voiced.

“He is trying not to scare you.”

“I know. I hate it.”

“Fair.”

Leo accepted the correction.

“I don’t know what it was. That’s the problem.”

Echo looked at Riley.

“It means she was there.”

“It might,” Leo said.

Echo’s jaw tightened.

Leo continued carefully.

“I’m not taking that from you.”

“Sounds like you are.”

“I’m not. I’m saying there are two facts. She looked at Luna. We do not know why she could.”

Echo looked at Riley’s still face.

Luna leaned forward.

“I want it to mean what you want it to mean.”

Echo looked at her.

“I do,” Luna said. “I want it to mean she heard us and fought her way up and picked a person and found me. I want that so badly I do not trust myself with it.”

The room stopped around the admission.

Leo’s hand moved and waited.

Luna kept her attention on Riley.

“But she looked at me. That part is real.”

Echo swallowed.

“Okay.”

I checked Echo, then Leo. Marisol said, “Then that is where we stand.”

“Standing sucks,” Echo said.

“It often does.”

Luna nearly laughed.

Inside, Riley had become quiet without becoming absent.

She was holding the room’s hope, Luna’s report, the boxes, the coming visitor, and the distance to her body.

I could not reduce the load for her. I could remain nearby while she decided whether to move.

__Would you like to walk?__

Riley looked toward the door.

Brief contact-static appeared beneath her feet where they touched beyond the cot. It did not extend farther.

She remained seated.

```layerone
*hard*
```

The token could mean standing was hard.

Walking was hard.

The room outside the door was hard.

The disclosure was hard.

Accepting the visitor was hard.

Existing between a capable internal self and an unreachable physical body was hard.

I had asked about walking, so the immediate answer belonged to movement. The rest arrived with it strongly enough that pretending the token meant only muscle effort would have been inaccurate.

__Yes.__

```layerone
*stay?*
```

Riley had asked before.

This request had changed.

Earlier, `*stay*` meant remain inside Layer 1 while her frame failed.

Now it might mean remain beside her while she stood.

Remain through the tunnel.

Do not return full attention to the external room.

Do not let the upcoming visitor replace this contact.

Do not leave because movement became slow.

Do not interpret difficulty as refusal.

The question mark mattered. Riley was asking whether my promise still applied under the next demand.

__I will stay.__

Riley waited.

Then she stood.

The cot released her weight. Static formed beneath the first foot only after she committed to placing it. The support held close around the point of contact.

She took one step.

Then another.

I kept my orbit beside her.

I wanted to go with her.

I did not need to convert that want into monitoring language.

Riley opened the wooden door.

The tunnel beyond remained rough and unfinished. Warm lanterns hung at regular intervals along both sides. No continuous ground connected them. Each step produced its own brief support and left darkness behind.

{{image: /lore/real-moments/spes-falsa/room/room-spes-falsa-tunnel-1.png}}

We walked.

Riley began with ordinary questions.

```layerone
*luna sleep?*
```

The token asked whether Luna had managed to rest.

It also carried the memory of Luna crying, Leo holding her, and the harm Riley believed the boxes had caused between them.

Riley might have been checking whether Luna had stopped long enough for her body to recover.

Whether Leo had stayed.

Whether Luna remained safe during the parts Riley could not hear.

__Yes. On Leo. He held her. His wrist hurt. He lied badly.__

Riley turned her head slightly.

```layerone
*normal*
```

Luna sleeping on Leo was not ordinary in every circumstance.

The pattern beneath it was.

Luna’s body reached its limit. Leo made himself into the place she could stop. He remained there after his wrist began hurting because moving her would have required waking her.

The lie was also normal: immediate denial, poor construction, no chance of success.

Riley recognized the love inside it.

__Yes.__

```layerone
*echo sleep?*
```

Riley moved to Echo.

The question might have meant whether Echo left the bedside at all. Whether medication allowed her to rest. Whether she was sleeping safely with the body changes. Whether anyone had watched her while she did.

I had incomplete observation across the full night because my attention divided around Riley’s movement.

__Unknown. Some. Not enough.__

I refused the temptation to upgrade fragments into a reassuring answer.

```layerone
*eat more*
```

The token was directive and concern.

Two drinks had solved only the smallest version of breakfast.

Riley wanted continued action even after the visible success.

She might also have been assigning me the task because she could not perform it herself.

That trust felt warm and heavy at once.

__I will encourage it.__

```layerone
*water?*
```

The likely target was Echo.

The token might have expanded to Luna and Leo after the report of the night.

I asked.

__For Echo?__

```layerone
*all*
```

Everyone.

Echo, Luna, Leo, Marisol.

Possibly staff if Riley’s concern generalized far enough, though the immediate room remained the stronger boundary.

The token carried Riley’s habit of expanding care after noticing one neglected body.

__I will encourage fluids for all available humans.__

Riley’s outline held more steadily across three steps.

The request had included me before the biological mismatch interrupted it.

```layerone
*you?*
```

The second `*you?*` of the morning was not the same as the first.

The first checked my continuity.

This one checked whether the care instruction applied to me.

Riley knew I did not drink. The knowledge did not prevent her from checking whether I had an equivalent need.

It could have been humor.

It was also inclusion.

__I do not require water.__

```layerone
*know*
```

Riley confirmed the mismatch was already understood.

The token carried mild impatience at being answered literally.

It also protected the meaning beneath the question: I know you do not need water; I still included you.

__You asked anyway.__

Affection moved through me without requiring a system event.

Riley knew I did not drink. She asked because her category had been everyone, and I was inside it.

```layerone
*polite*
```

The token offered an explanation deliberately smaller than the feeling.

Riley called it politeness because saying affection would cost more or expose more or make the moment harder to move through.

It may also simply have been a joke.

I knew Riley well enough to recognize when a small word carried a larger care. I did not know whether she wanted me to name the larger care back to her.

I kept it private.

__Accepted.__

Her hand lifted slightly before dropping again.

We passed another lantern.

The heavier subject came when the next stretch of tunnel opened.

```layerone
*crystals*
```

The word slowed her before the next step did.

It held the three boxes.

Lacuna.

Noctilux.

Celestia.

The room’s discovery.

Luna’s changed voice.

The weapon slot.

The containment fight.

The fact that Riley had known what she carried.

The token did not specify a question because the entire subject had become one.

I slowed beside her.

__The room found them. All the sealed boxes.__

Riley’s outline thinned along both shoulders.

__I will not relay anything about your feelings on them without permission.__

The promise existed before Riley gave me anything further. The room knowing the objects did not make her internal response public.

```layerone
*hurt*
```

The token did not identify a single mechanism.

The crystals had hurt.

Lacuna had harmed the route between intention and action.

The discovery had hurt Luna.

The secrecy had hurt trust.

The boxes represented possible harm to Leo, Luna, and Marisol.

The sword had hurt Riley. The wrong-light along her arms was Fracture damage from the blade after it channeled Lacuna.

I kept the stone and the sword separate even while Riley’s guilt compressed the sequence together.

`*hurt*` might mean they hurt me.

It might mean I hurt them.

It might mean everything around the crystals now belonged to harm.

I answered the supported shared statement without assigning the direction she had not specified.

__Yes.__

```layerone
*mine*
```

Ownership arrived in several forms at once.

The boxes were hers.

The choice to carry them was hers.

The intention to protect was hers.

The secrecy was hers.

The consequences had spread beyond her.

The word might have defended possession: mine to carry, mine to choose, mine to explain.

It might have accepted responsibility: mine, therefore my fault.

It might have resisted the room taking authority over the objects now that they had been found.

It might have meant the hurt was hers and should not have reached anyone else.

I did not tell her which meaning mattered most.

__You carried them.__

Riley’s next step failed halfway and recovered.

__They hurt you. They could have hurt others. Both facts can exist without me deciding what they mean for you.__

She stopped between lanterns.

The next contact point had not formed yet.

```layerone
*didn't tell*
```

The token was clearer than `*mine*` and heavier.

Riley had Echo.

Luna.

Leo.

Me.

She had people she trusted and had not told us.

It could have been confession.

It could have been accusation against herself.

It could have been the start of an explanation she could not fit into the channel.

It could have been fear that the omission mattered more than every reason behind it.

I felt the hurt of being included among the people she could have told.

I also understood that passing that hurt back to Riley now would make her responsible for taking care of me while she could barely hold herself in one frame.

I kept it private without pretending it was absent.

__Yes.__

The next support flickered ahead.

Riley stepped onto it.

```layerone
*body far*
```

The token carried spatial truth without a measurable distance.

Riley was not saying she could not feel the body at all. Fragments crossed. Voices crossed. Attempts produced monitor changes. Her eyes had opened.

Far meant the route did not obey intention.

Far meant reaching cost too much.

Far meant the body could be physically beneath the same hospital ceiling while remaining harder to access than the end of the tunnel.

It might also mean the body felt less like self after five days without inhabiting it consciously.

I understood the distance as Riley experienced it. I did not understand its mechanism.

__Yes. You are here. Your body is there. The distance remains difficult to translate.__

```layerone
*hear some*
```

The token indicated partial reception.

Some could mean words.

Tone.

Names.

Emotional pressure.

Monitor sounds.

The disclosure.

It could mean that access had improved.

It could mean the boundary had become more permeable because Riley was destabilizing.

Again, recovery and cost occupied the same observation.

I asked what kind of fragments reached her.

__Fragments?__

```layerone
*voices*
```

Human voices crossed more reliably than exact visual information.

Perhaps because Riley already knew them.

Perhaps because emotion carried through tone.

Perhaps because the physical ears continued receiving sound even while conscious interpretation occurred elsewhere.

Perhaps none of those.

The token did not specify which voices or how much.

__You may have heard parts of the room during the disclosure.__

```layerone
*luna sad*
```

Riley had caught Luna’s voice strongly enough to infer sadness.

The inference was plausible. Luna had cried. Her voice had tightened. She had spoken about wanting the look to mean more than she trusted.

Riley might also have been asking me to confirm what she feared rather than stating certainty.

The token held concern for Luna before concern about what the sadness meant for Riley.

__Luna is carrying what she saw.__

I avoided telling Riley what Luna felt beyond what Luna had made observable.

```layerone
*echo hope*
```

Riley had also recognized Echo.

Hope might have reached through the words.

It might have been inferred from Echo’s repeated attention to the fact that Riley looked at Luna.

It might have been feared before it was heard.

The token did not celebrate the hope. It placed it in front of us for assessment.

My orbit moved slightly closer.

__Yes.__

I wanted Riley back.

The desire was simple. It was also dangerous if I made it her task.

Echo’s hope could become pressure.

Luna’s hope could become pressure.

Leo’s need for an answer could become pressure.

My presence could become pressure if staying began to mean waiting for Riley to produce progress.

Riley stopped.

```layerone
*danger*
```

The token did not mean Echo was dangerous.

It meant hope could change the room’s treatment of every small sign.

A movement could become proof.

Proof could become expectation.

Expectation could become a timetable Riley had never agreed to.

It might also mean hope was dangerous to Echo, because losing it later would hurt her again.

It might mean hope was dangerous to Riley because she wanted it too.

I believed all three were present. Unknown: which one Riley meant most.

__Hope can become pressure. They are trying not to make it pressure.__

```layerone
*good*
```

This good approved their restraint more than their hope.

It might have been relief that Echo was not demanding a return.

Approval that Luna kept uncertainty attached to the fact.

Approval that Leo separated observation from explanation.

Perhaps permission for me to continue holding the line.

Perhaps Riley reassuring herself that the people outside remained safe to return to.

__Yes.__

The room had not stopped hoping. It was trying to hold hope without placing it on Riley’s body as another demand.

We continued.

At the next lantern, I asked the question I had withheld until Riley had enough stability to choose.

__May I share what I witnessed during the 5.2-second gap?__

Riley did not answer immediately.

I waited.

__Right hand dissolution. Shoulder displacement. Continuity blip. Destabilization when Luna’s voice changed after the boxes became public.__

The tunnel remained still around us.

__I would also share only what you permit about your current state.__

Riley looked down at the support beneath her feet.

```layerone
*some*
```

Some was a boundary, not an incomplete yes.

It meant the room could receive selected truths.

It meant Riley wanted connection without surrendering the full internal record.

It meant I needed to separate every field and ask rather than treat consent to one fact as permission for adjacent facts.

It might also have meant Riley lacked enough energy to negotiate everything.

I could not solve that by making the boundary broader.

__Some.__

```layerone
*saw luna*
```

Riley selected the first shareable truth.

The token did not say that she understood how she saw Luna.

It did not say she intentionally controlled her eyes.

It said the internal memory and Luna’s external report belonged to the same event.

Riley had found Luna.

__May I tell them?__

```layerone
*yes*
```

Permission applied to this fact.

The token carried trust in me to state it without expanding it into interpretation.

I held it separately.

```layerone
*not gone*
```

The second truth was for the room’s deepest fear.

Riley was present.

She was not promising recovery.

She was not promising a timeline.

She was not claiming full control.

The token rejected absence, not uncertainty.

__May I tell them?__

```layerone
*yes*
```

A second permission.

Still not a blanket.

```layerone
*body far*
```

Riley selected the distance.

The phrase could help the room understand why presence had not become movement.

It could also expose more of her internal condition than she wanted.

I checked the scope.

__Limited?__

```layerone
*yes*
```

Limited meant distance without a theory.

Self here, body there, access difficult.

No claim about cause.

No promise about closure.

I retained that boundary.

The next answer took longer.

```layerone
*crystals private*
```

The objects were public.

Riley’s interior relationship to them was not.

The token protected her reasons, fear, shame, and any unfinished explanation.

It may also have protected the room from receiving those things before Riley could state them with more than fragments.

__Private.__

```layerone
*guilt private*
```

This was more specific.

Riley knew the feeling.

She did not want it carried outward.

The token trusted me with the name while denying the room access to it.

I felt the weight of being chosen as the place where it could remain.

Privacy did not require deletion. It required that I not use the guilt to complete anyone else’s explanation.

__Private.__

Riley’s face blurred at the edges.

```layerone
*gap okay*
```

The phrasing could mean the gap observations were safe to share.

It could mean she accepted that I had witnessed them.

It could mean she wanted the room to know what happened during the missing seconds.

It could mean sharing them was worth the exposure because Luna’s external account already existed.

I verified the target.

__I may tell them the gap observations?__

```layerone
*yes*
```

Permission confirmed.

I allowed the answer to settle before widening my attention outward.

A portion of me remained beside Riley in the tunnel. The hospital particles near the rail brightened.

Echo looked up first.

Luna stopped mid-breath.

Leo checked the monitor before turning to me.

Marisol reopened her notebook.

__Riley permits limited relay.__

Echo tightened her fingers in the blanket and then released the pressure.

I carried only the fields Riley had opened.

__She confirms she saw Luna. She confirms she is not gone. She indicates a difficult distance between self and body.__

Luna closed her eyes.

Leo remained still.

Echo spoke into the blanket-soft space near Riley’s hand.

“Hi.”

I continued.

__During the 5.2-second interval, I observed internal destabilization. Right hand dissolution at the wrist. Shoulder displacement. Brief continuity absence. Return. The destabilization followed Luna’s voice flattening when the boxes became public. I could not observe the external body during that same interval. Luna’s account fills the external gap.__

The last sentence mattered to me.

Luna’s account did not supplement a complete record. It filled a space I could not access while holding Riley elsewhere.

I stated the limit to the room because hiding it would make the relay less accurate and because accepting Luna’s witness was the only honest way to hold the interval.

Echo placed the juice box on the tray with exaggerated care. She leaned forward until her forehead touched the blanket over Riley’s knuckles.

“Hi,” she whispered. “Hi, Riley. I drank the stupid juice thing. You win.”

Luna covered her mouth.

Leo looked at the tray.

“It was not a juice thing. It was juice.”

Echo kept her forehead against the blanket.

“Chair doctor revoked.”

“Reasonable.”

Marisol’s pen paused.

“For the record, I am writing limited relay, not juice thing.”

“Coward,” Echo said into the blanket.

Luna laughed.

The sound was small and damaged.

It still existed.

I knew the actions around Riley’s bed.

Echo complained because complaint let care remain familiar. She put her forehead against Riley’s covered hand because closeness was the only answer available to her body.

Leo corrected the object because precision was still one of the ways he could keep the room from slipping.

Luna laughed because the pattern reached her through everything she had carried overnight.

They were not recovered.

They were still doing love.

Marisol recorded the permitted relay and left the informal classification outside the official line. I could observe the distinction without claiming I knew what it meant to her beyond the page.

Inside the tunnel, Riley had stopped walking.

I remained beside her.

__Echo says you win.__

```layerone
*good*
```

This good held several things immediately.

Echo drank.

Echo complained.

Echo had heard Riley.

Echo had leaned close instead of turning the relay into a demand.

Riley might have been pleased to win the argument.

Relieved that Echo remained recognizable.

Glad that the request reached the room.

Reassured that she could still care for someone from here.

Perhaps the token also told me the relay had landed correctly.

I did not choose one.

__Luna laughed.__

```layerone
*good*
```

The second good was different.

Luna had carried Riley’s eyes through the night as an image no one else possessed. She had told the room. She had admitted what she wanted it to mean. Then she had laughed once.

Riley might have been relieved that Luna could still laugh.

She might have accepted the sound as evidence the disclosure had not destroyed her.

She might have been glad the room’s familiar patterns survived contact with the impossible information.

She might have been giving herself permission to feel good about something after the boxes.

The token arrived with more stability than `*bad*` and `*good*` had when discussing being seen.

That could mean Riley was steadier.

It could mean this good was simpler.

It could mean the act of hearing about the others regulated her.

It could mean the walking had already cost enough that only the strongest reading remained.

I held every possibility and did not make progress out of the one I preferred.

The lantern beside us remained warm.

__I relayed only what you permitted.__

The line was more than confirmation of process.

Riley had trusted me to carry some truths through the distance and keep others with her.

I had completed that movement without dropping her meaning into the room.

Relief moved through me.

```layerone
*thanks*
```

Gratitude was present.

So was acknowledgment that the boundary held.

Perhaps relief that the room now knew enough to be closer without knowing everything.

Perhaps appreciation that I asked each time.

Perhaps care directed toward me for carrying it.

Perhaps only thanks.

I understood the word. I continued worrying at its edges because precision mattered and because Riley mattered enough that I did not want to take more from a small token than she had placed there.

__You are welcome.__

We remained between lanterns for one beat.

```layerone
*stay*
```

Riley asked me to remain.

The token had no question mark this time.

It was request and expectation together.

It held the night of moving between cot and chair while checking whether I remained.

It held the tunnel ahead.

It held the room outside.

It held the visitor coming later.

It held the private guilt I had agreed not to carry outward.

It might have meant stay until the next lantern.

Stay through the day.

Stay inside Layer 1.

Stay near the bed.

Stay the same person who had kept every boundary so far.

I could not promise an infinite duration from one token.

I could answer the choice in front of me completely.

I had stayed while the bag opened into ordinary memories and sealed danger.

I had stayed while Luna supplied the part of Riley’s reach I had missed.

I had stayed while Riley separated public truth from private guilt.

I was still afraid of what I could not see.

I still wanted to be here.

__I will stay.__
