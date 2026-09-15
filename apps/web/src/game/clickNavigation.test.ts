import { it, expect } from "vitest";
import { findWalkPath } from "./clickNavigation";
import { CombatInput } from "./combatInput";
it("routes around a wall and rejects a destination inside it",()=>{
  const wall={min:{x:100,y:50},max:{x:160,y:150}};
  expect(findWalkPath({x:0,y:100},{x:250,y:100},[wall]).length).toBeGreaterThan(1);
  expect(findWalkPath({x:0,y:100},{x:120,y:100},[wall])).toEqual([]);
});
it("keeps walking while casting and stops at the destination",()=>{
  const input=new CombatInput(); input.setDestination({x:300,y:100});
  input.begin("arena:1",2);input.finish("arena:1");
  const command=input.consume({x:100,y:100});
  expect(command.actions.releaseSkill).toBe(2);expect(command.move.x).toBe(1);
  expect(input.consume({x:100,y:100}).move.x).toBe(1);
  expect(input.consume({x:295,y:100}).move).toEqual({x:0,y:0});
});
