import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STARTING_BALANCE } from "@/lib/config";
export async function POST(){const user=await currentUser();if(!user)return NextResponse.json({error:"Log in first."},{status:401});await db.$transaction([db.trade.deleteMany({where:{userId:user.id}}),db.holding.deleteMany({where:{userId:user.id}}),db.user.update({where:{id:user.id},data:{balance:STARTING_BALANCE}})]);return NextResponse.json({ok:true})}
