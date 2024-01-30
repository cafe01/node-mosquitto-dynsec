
import {connect, MqttClient} from "mqtt";
import {AddRoleACLRequest, CreateClientRequest, GetClientResponse, ListClientsResponse, ListGroupsResponse, ListRequest, ListRolesResponse, RemoveRoleACLRequest} from "./command_types";


export interface ConnectOptions {
  hostname?: string;
  port?: number;
  protocol?: string;
  username?: string;
  password?: string;
}

export interface CommandPayload {
  command: string;
  [opt: string]: string;
}

export interface CommandResponse {
  command: string;
  data?: object;
  error?: string;
}

export interface ResponseTopicPayload {
  responses?: CommandResponse[];
}

interface PendingCommand {
  resolve: (data?: object) => void;
  reject: (error?: string) => void;
}

type DefaultAclType = "publishClientSend" | "publishClientReceive" | "subscribe" | "unsubscribe"
interface DefaultACLEntry {
  acltype: DefaultAclType;
  allow: boolean;
}

export class MosquittoDynsec {

  private mqtt?: MqttClient
  private pendingCommands: {[commandName: string]: PendingCommand} = {}
  private apiVersion = "v1"

  timeoutSeconds = 2

  private onCommandResponse(topic: string, payload: ResponseTopicPayload) {

    if (!Array.isArray(payload.responses))
      throw new Error("Invalid ResponseTopicPayload")

    // resolve pending promises
    payload.responses.forEach((res: CommandResponse) => {

      // console.log("Got command response: ", res)
      const pendingCommand = this.pendingCommands[res.command]
      if (!pendingCommand)
        return console.warn(`Received response for unsent command '${res.command}'`, res.data)

      delete this.pendingCommands[res.command]
      if (res.error) {
        // console.log("rejecting command", res.command, res.error)
        pendingCommand.reject(res.error)
      }
      else {
        // console.log("resolving command", res.command, res.data)
        pendingCommand.resolve(res.data)
      }

    })
  }

  setConnection(mqtt: MqttClient) {
    this.mqtt = mqtt
  }

  connect(options: ConnectOptions = {}): Promise<void> {

    // set defaults
    const hostname = options.hostname || "localhost"
    const port = options.port || 1883
    const protocol = options.protocol || "mqtt"
    const username = options.username || "admin-user"
    const password = options.password

    const url = `${protocol}://${hostname}:${port}`

    const mqtt = connect(url, {username, password})

    const responseTopic = "$CONTROL/dynamic-security/" + this.apiVersion + "/response"

    mqtt.on("message", (topic, payload) => {

      this.onCommandResponse.call(this, topic, JSON.parse(String(payload)))
    })

    return new Promise<void>((resolve, reject) => {

      mqtt.on("error", () => {reject()})
      mqtt.on("connect", () => {
        // console.log("on-connect")
        mqtt.subscribe(responseTopic)
        this.mqtt = mqtt
        resolve()
      })
    })
  }

  disconnect(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.mqtt) return resolve()
      this.mqtt.end(true, {}, resolve)
    })
  }

  sendCommand(commandName: string, commandParams: object = {}): Promise<object | void> {

    if (!this.mqtt)
      throw new Error("Can't sendCommand: not connected yet.")

    // command pending
    if (this.pendingCommands[commandName])
      throw new Error(`Command ${commandName} already is pending.`)

    // create pending command
    const commandPromise = new Promise<object | void>((resolve, reject) => {
      this.pendingCommands[commandName] = {resolve, reject}
    })

    // send command
    const command: CommandPayload = Object.assign({}, commandParams, {command: commandName})
    const payload = JSON.stringify({commands: [command]})
    this.mqtt.publish("$CONTROL/dynamic-security/v1", payload)

    const timeoutPromise = new Promise<object>((resolve, reject) => {
      setTimeout(() => reject("COMMAND_TIMEOUT"), 1000 * this.timeoutSeconds)
    })

    return Promise.race<Promise<object | void>>([commandPromise, timeoutPromise])
  }

  async getDefaultACLAccess(acltype: DefaultAclType) {
    const res = await (this.sendCommand("getDefaultACLAccess", {acltype}) as Promise<any>)
    return res.acls
  }

  setDefaultACLAccess(acls: DefaultACLEntry[]) {
    return this.sendCommand("setDefaultACLAccess", {acls}) as Promise<void>
  }

  listClients(params: ListRequest = {}) {
    return this.sendCommand("listClients", params) as Promise<ListClientsResponse>
  }

  createClient(params: CreateClientRequest) {
    return this.sendCommand("createClient", params) as Promise<void>
  }

  deleteClient(username: string) {
    return this.sendCommand("deleteClient", {username})
  }

  setClientId(username: string, clientid: string) {
    return this.sendCommand("setClientId", {username, clientid})
  }

  setClientPassword(username: string, password: string) {
    return this.sendCommand("setClientPassword", {username, password}) as Promise<void>
  }

  async getClient(username: string): Promise<GetClientResponse> {
    const promise = this.sendCommand("getClient", {username}) as Promise<{client: GetClientResponse}>
    const res = await promise
    return res.client
  }

  addClientRole(username: string, rolename: string, priority?: number) {
    return this.sendCommand("addClientRole", {username, rolename, priority}) as Promise<void>
  }

  removeClientRole(username: string, rolename: string) {
    return this.sendCommand("removeClientRole", {username, rolename}) as Promise<void>
  }

  enableClient(username: string) {
    return this.sendCommand("enableClient", {username}) as Promise<void>
  }

  disableClient(username: string) {
    return this.sendCommand("disableClient", {username}) as Promise<void>
  }

  // role commands

  createRole(rolename: string) {
    return this.sendCommand("createRole", {rolename}) as Promise<void>
  }

  deleteRole(rolename: string) {
    return this.sendCommand("deleteRole", {rolename}) as Promise<void>
  }

  async getRole(rolename: string): Promise<{rolename: string; acls: string[]}> {
    const res = await (this.sendCommand("getRole", {rolename}) as Promise<any>)
    return res.role
  }

  listRoles(params: ListRequest = {}) {
    return this.sendCommand("listRoles", params) as Promise<ListRolesResponse>
  }

  addRoleACL(params: AddRoleACLRequest) {
    return this.sendCommand("addRoleACL", params) as Promise<void>
  }

  removeRoleACL(params: RemoveRoleACLRequest) {
    return this.sendCommand("removeRoleACL", params) as Promise<void>
  }

  // group commands

  createGroup(groupname: string) {
    return this.sendCommand("createGroup", {groupname}) as Promise<void>
  }

  deleteGroup(groupname: string) {
    return this.sendCommand("deleteGroup", {groupname}) as Promise<void>
  }

  listGroups(params: ListRequest = {}) {
    return this.sendCommand("listGroups", params) as Promise<ListGroupsResponse>
  }

  async getGroup(groupname: string) {
    const res = await (this.sendCommand("getGroup", {groupname}) as Promise<any>)
    return res.group
  }

  async getAnonymousGroup() {
    const res = await (this.sendCommand("getAnonymousGroup") as Promise<any>)
    return res.group
  }

  setAnonymousGroup(groupname: string) {
    return this.sendCommand("setAnonymousGroup", {groupname}) as Promise<void>
  }

  addGroupClient(groupname: string, username: string) {
    return this.sendCommand("addGroupClient", {groupname, username}) as Promise<void>
  }

  removeGroupClient(groupname: string, username: string) {
    return this.sendCommand("removeGroupClient", {groupname, username}) as Promise<void>
  }

  addGroupRole(groupname: string, rolename: string, priority?: number) {
    return this.sendCommand("addGroupRole", {groupname, rolename, priority}) as Promise<void>
  }

  removeGroupRole(groupname: string, rolename: string) {
    return this.sendCommand("removeGroupRole", {groupname, rolename}) as Promise<void>
  }
}
