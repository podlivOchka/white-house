import test from "node:test";
import assert from "node:assert/strict";
import {seal,unseal} from "../src/admin/vault.ts";

test("device connection requires the correct password and detects tampering",async()=>{
  const token="github_pat_"+"test_only_".repeat(5),password="Device-test-password";
  const vault=await seal(token,password,"test-owner");
  assert.ok(!JSON.stringify(vault).includes(token));
  assert.ok(!JSON.stringify(vault).includes(password));
  assert.deepEqual(await unseal(vault,password),{token,login:"test-owner"});
  await assert.rejects(unseal(vault,"Wrong-test-password"),/Неверный пароль/);
  await assert.rejects(unseal({...vault,login:"different-owner"},password),/Неверный пароль/);
  await assert.rejects(unseal({...vault,ciphertext:(vault.ciphertext[0]==="A"?"B":"A")+vault.ciphertext.slice(1)},password),/Неверный пароль/);
  const another=await seal(token,password,"test-owner");
  assert.notEqual(another.salt,vault.salt);assert.notEqual(another.iv,vault.iv);
  await assert.rejects(seal(token,"short","test-owner"),/12/);
});
