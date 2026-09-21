"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MeetingDetail from "@/features/meetings/components/MeetingDetail";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type { Meeting } from "@/features/meetings/types/meeting.types";
function Inner(){const p=useParams<{id:string}>();const[m,setM]=useState<Meeting|null>(null);const[e,setE]=useState<string|null>(null);useEffect(()=>{MeetingService.getMeeting(p.id).then(setM).catch(()=>setE("Couldn't load this meeting."))},[p.id]);if(e)return <p className="text-sm text-danger">{e}</p>;if(!m)return <div className="mx-auto max-w-5xl space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-10 animate-shimmer rounded-md"/>)}</div>;return <MeetingDetail meeting={m} onMeetingChange={setM}/>};export default function Page(){return <Suspense fallback={null}><Inner/></Suspense>}
