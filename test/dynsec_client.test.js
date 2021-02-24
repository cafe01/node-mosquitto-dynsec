
var expect = require("chai").expect;
var {MosquittoDynsec} = require("../dist")

let dynsec = new MosquittoDynsec()
// let connected = false

before("connect", async function() {
  // this.timeout(10000)
  try {
    await dynsec.connect({
      port: 10123,
      password: "123"
    })
    // connected = true
  } catch(e) {
    console.error("Connect error:", e)
    this.skip()
  }
})

after(async function() {
  await dynsec.disconnect()
})



describe("client commands", () => {



  it("createClient", async function(){

    const res = await dynsec.createClient({ username: "user1", password: "pass" })
    expect(res).to.be.undefined
  })

  // TODO create duplicated client

  it("setClientId", async function(){

    const res = await dynsec.setClientId("user1", "user1_clientid")
    expect(res).to.be.undefined
  })


  it("setClientPassword", async function(){

    const res = await dynsec.setClientPassword("user1", "pass2")
    expect(res).to.be.undefined
  })


  it("listClients", async function(){

    const res = await dynsec.listClients()
    expect(typeof res.totalCount).to.be.equal("number")
  })


  it("disableClient", async function(){

    const res = await dynsec.disableClient("user1")
    expect(res).to.be.undefined
  })


  it("getClient", async function(){

    const res = await dynsec.getClient("user1")
    expect(res).to.be.deep.equal({
      username: "user1",
      clientid: "user1_clientid",
      disabled: true,
      roles: [],
      groups: []
    })
  })

  it("enableClient", async function(){

    const res = await dynsec.enableClient("user1")
    expect(res).to.be.undefined
  })

  it("delete user1", async function(){

    const res = await dynsec.deleteClient("user1")
    // console.log("res", res)
    expect(res).to.be.undefined
  })


})

describe("role commands", () => {



  it("createRole", async function() {
    const res = await dynsec.createRole("role1")
    expect(res).to.be.undefined
  })

  it("addRoleACL", async function() {

    const res = await dynsec.addRoleACL({
      rolename: "role1",
      acltype: "publishClientSend",
      allow: true,
      topic: "/foobar",
      priority: 3
    })

    expect(res).to.be.undefined
  })

  it("removeRoleACL", async function() {

    const res = await dynsec.removeRoleACL({
      rolename: "role1",
      acltype: "publishClientSend",
      topic: "/foobar",
    })

    expect(res).to.be.undefined
  })

  it("getRole", async function() {
    const res = await dynsec.getRole("role1")
    expect(res).to.be.deep.equal({rolename: "role1", acls: []})
  })

  it("listRoles", async function() {
    const res = await dynsec.listRoles()
    expect(res.roles).to.be.deep.equal(["admin", "role1"])
  })

  it("deleteRole", async function() {
    const res = await dynsec.deleteRole("role1")
    expect(res).to.be.undefined
  })

})

describe("group commands", () => {

  before(async () => {
    await dynsec.createClient({username: "groupclient1"})
    await dynsec.createRole("grouprole1")
  })

  after(async () => {
    await dynsec.deleteClient("groupclient1")
    await dynsec.deleteRole("grouprole1")
  })

  it("createGroup", async function() {
    const res = await dynsec.createGroup("group1")
    expect(res).to.be.undefined
  })

  it("addGroupClient", async function() {
    const res = await dynsec.addGroupClient("group1", "groupclient1")
    expect(res).to.be.undefined
  })


  it("addGroupRole", async function() {
    const res = await dynsec.addGroupRole("group1", "grouprole1")
    expect(res).to.be.undefined
  })

  it("getGroup", async function() {
    const res = await dynsec.getGroup("group1")
    expect(res).to.be.deep.equal({
      groupname: "group1",
      clients:[{username: "groupclient1"}],
      roles: [{rolename: "grouprole1"}]
    })
  })

  it("listGroups", async function() {
    const res = await dynsec.listGroups()
    expect(res.groups).to.be.deep.equal(["group1"])
  })

  it("setAnonymousGroup", async function() {
    const res = await dynsec.setAnonymousGroup("group1")
    expect(res).to.be.undefined
  })

  it("getAnonymousGroup", async function() {
    const res = await dynsec.getAnonymousGroup()
    expect(res).to.be.deep.equal({groupname: "group1"})
  })

  it("deleteGroup", async function() {
    const res = await dynsec.deleteGroup("group1")
    expect(res).to.be.undefined
  })

})


describe("acl commands", () => {


  it("getDefaultACLAccess", async function() {
    const res = await dynsec.getDefaultACLAccess()
    expect(res).to.have.lengthOf(4)
  })

})
