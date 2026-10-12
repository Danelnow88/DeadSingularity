'use strict';
// Reproducible read-only balance report; does not touch saves or production RNG.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),NV={},box={window:{NV},Math,console};
for(const file of ['data/balance','data/consumables'])vm.runInNewContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),box);
let seed=1729;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const trials=100000;let premium=0,bounty=0;
for(let i=0;i<trials;i++){const stock=NV.createEconomyStock(rng);premium+=Number(stock.premium);bounty+=Number(stock.consumables.includes('bounty'));}
const intervals=[1.3,1,.6,.25].map(seconds=>({refillSeconds:seconds,chancePerRoll:NV.weaponDropChanceForInterval(seconds),chanceAtLeastOnePerCombatMinute:1-Math.pow(1-NV.weaponDropChanceForInterval(seconds),60/seconds)}));
console.log(JSON.stringify({seed:1729,trials,intervals,premiumVisitFrequency:premium/trials,bountyVisitFrequency:bounty/trials,
  bounty:{duration:NV.ECONOMY.bountyDuration,killsPerToken:NV.ECONOMY.bountyEveryKills,maxTokens:NV.ECONOMY.bountyTokenCap,price:NV.CONSUMABLES.bounty.price,maxNetProfit:NV.ECONOMY.bountyTokenCap-NV.CONSUMABLES.bounty.price},
  armoryUnlockWaves:NV.ARMORY_SLOT_WAVES,notes:'Drop probability excludes boss time and occupied floor slot. Premium stock still needs an eligible owned weapon.'},null,2));
