import { test } from "node:test";
import { match } from "node:assert";
import { NiimbotVirtualClient, RequestCommandId, ResponseCommandId, Utils } from "..";

const b1dump = `
>> 035555c10101c1aaaa
<< 5555c20103c0aaaa
>> 555540010849aaaa
<< 5555480210005aaaaa
>> 5555a50101a5aaaa
<< 5555b5103030032000c80000000f010204019800dfaaaa
>> 5555dc0104d9aaaa
<< 5555d9091f90044c000001000016aaaa
>> 5555dc0103deaaaa
<< 5555de0a050a050e01800202010050aaaa
>> 555540010f4eaaaa
<< 55554f02001459aaaa
>> 555540010f4eaaaa
<< 55554f02001459aaaa
>> 55551a01011aaaaa
<< 55551b27881d7e4fd997000008313032363232363010505a31473232313332323030343230350114000201a6aaaa
>> 5555dc0104d9aaaa
<< 5555d9091f91044c000001000017aaaa
>> 55550b01010baaaa
<< 55550c3d0131464336313632334646334530383642414544393533343146383939433539313931453534373633364445434336323143304331464241423339383834aaaa
>> 55550b010208aaaa
<< 55550c05023532384571aaaa
>> 55550b010309aaaa
<< 55550c000caaaa
>> 55550b01010baaaa
<< 55550c3d0131464336313632334646334530383642414544393533343146383939433539313931453534373633364445434336323143304331464241423339383834aaaa
>> 55550b010208aaaa
<< 55550c05023532384571aaaa
>> 55550b010309aaaa
<< 55550c000caaaa
>> 5555dc0104d9aaaa
<< 5555d9091f92044c000001000014aaaa
`;

const otherDump = `
>> 03 5555 c1 01 01 c1 aaaa
<< 5555 c2 01 03 c0 aaaa
>> 5555 dc 01 01 dc aaaa
<< 5555 dd 0a 20a3005a005a324c0104 2f aaaa
>> 5555 40 01 08 49 aaaa
<< 5555 48 02 0106 4d aaaa
>> 5555 40 01 0c 4d aaaa
<< 5555 4c 02 2501 6a aaaa
>> 5555 40 01 09 48 aaaa
<< 5555 49 02 2507 69 aaaa
>> 5555 40 01 0b 4a aaaa
<< 5555 4b 05 f722050731 a8 aaaa
`;

test("Virtual client", async () => {
  const client = new NiimbotVirtualClient();

  client.loadHexDump(b1dump);

  client.on("packetsent", (e) => {
    console.log(`>> ${Utils.bufToHex(e.packet.toBytes())} (${RequestCommandId[e.packet.command]})`);
  });

  client.on("packetreceived", (e) => {
    console.log(`<< ${Utils.bufToHex(e.packet.toBytes())} (${ResponseCommandId[e.packet.command]})`);
  });

  await client.connect();

  console.log(client.getPrinterInfo());

  await client.disconnect();
});
