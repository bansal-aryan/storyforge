export type VoiceAction = "ability" | "guard" | "focus" | "hold" | "follow" | "chat";

export function parsePartyCommand(message: string, memberNames: string[]): { targetName?: string; everyone: boolean; action: VoiceAction } {
  const normalized = message.trim().toLowerCase();
  const targetName = memberNames.find((name) => normalized.includes(name.toLowerCase()));
  const everyone = /\b(everyone|everybody|party|fellowship|all of you)\b/.test(normalized);
  let action: VoiceAction = "chat";
  if (/\b(ability|special|power|skill|heal|restore|stabilize|relieve|interrupt|mark|snipe|clear the pressure)\b/.test(normalized)) action = "ability";
  else if (/\b(guard|protect|defend|cover me|keep me safe|take the hit)\b/.test(normalized)) action = "guard";
  else if (/\b(focus|attack|strike|shoot|hit|take them|engage)\b/.test(normalized)) action = "focus";
  else if (/\b(hold|stay there|wait there|keep position)\b/.test(normalized)) action = "hold";
  else if (/\b(follow|come with|stay with me|regroup|come back)\b/.test(normalized)) action = "follow";
  return { targetName, everyone, action };
}
