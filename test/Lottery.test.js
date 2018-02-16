const assert = require("assert");
const ganache = require("ganache-cli");
const Web3 = require("web3");
const { abi, evm } = require("../compile");

const web3 = new Web3(ganache.provider());

let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  lottery = await new web3.eth.Contract(abi)
    .deploy({ data: evm.bytecode.object })
    .send({ from: accounts[0], gas: "1000000" });
});

describe("Lottery Contract", () => {
  it("Deploys a Contract", () => {
    assert.ok(lottery.options.address);
  });

  it("Test Single Lottery Entry", async () => {
    await lottery.methods
      .enter()
      .send({ from: accounts[0], value: web3.utils.toWei("0.02", "ether") });

    const players = await lottery.methods
      .getPlayers()
      .call({ from: accounts[0] });

    assert.equal(players.length, 1);
    assert.equal(players[0], accounts[0]);
  });

  it("Test Multiple Lottery Entries", async () => {
    await lottery.methods
      .enter()
      .send({ from: accounts[0], value: web3.utils.toWei("0.02", "ether") });
    await lottery.methods
      .enter()
      .send({ from: accounts[1], value: web3.utils.toWei("0.02", "ether") });
    await lottery.methods
      .enter()
      .send({ from: accounts[2], value: web3.utils.toWei("0.02", "ether") });

    const players = await lottery.methods
      .getPlayers()
      .call({ from: accounts[0] });

    assert.equal(players.length, 3);
    assert.equal(players[0], accounts[0]);
    assert.equal(players[1], accounts[1]);
    assert.equal(players[2], accounts[2]);
  });

  it("Test Minimum Entry Ether", async () => {
    let entryCreated = false;
    try {
      await lottery.methods
        .enter()
        .send({ from: accounts[0], value: web3.utils.toWei("0.001", "ether") });

      entryCreated = true;
    } catch (err) {
      assert(err);
    }

    assert(!entryCreated);
  });

  it("Test Pick Winner restriction", async () => {
    let winnerPicked = false;
    try {
      await lottery.methods.pickWinner().send({ from: accounts[0] });
      winnerPicked = true;
      assert(false);
    } catch (err) {
      assert(err);
    }

    assert(!winnerPicked);
  });

  it("Test Pick Winner", async () => {
    await lottery.methods
      .enter()
      .send({ from: accounts[1], value: web3.utils.toWei("8", "ether") });

    const initialBalance = await web3.eth.getBalance(accounts[1]);
    await lottery.methods.pickWinner().send({ from: accounts[0] });
    const finalBalance = await web3.eth.getBalance(accounts[1]);

    // Balance should be updated accordingly.
    assert(finalBalance - initialBalance > 7.8);

    // Players should be reset to empty array.
    const players = await lottery.methods
      .getPlayers()
      .call({ from: accounts[0] });
    assert.equal(players.length, 0);
  });
});
