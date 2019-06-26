export default async function getBalance (addr) {
  const b = await web3.eth.getBalance(addr);
  return web3.utils.toBN(b);
}
