

export interface ListRequest {
  count?: number;
  offset?: number;
}

export interface ListClientsResponse {
  totalCount: number;
  clients: string[];
}

export interface ListGroupsResponse {
  totalCount: number;
  groups: string[];
}

export interface ListRolesResponse {
  totalCount: number;
  roles: string[];
}

export interface CreateClientRequest {
  username: string;
  password?: string;
  clientid?: string;
}

export interface GetClientResponse {
  username: string;
  clientid: string;
  roles: string[];
  groups: string[];
}

type AclType =
  "publishClientSend" |
  "publishClientReceive" |
  "subscribeLiteral" |
  "subscribePattern" |
  "unsubscribeLiteral" |
  "unsubscribePattern"

export interface AddRoleACLRequest {
  rolename: string;
  acltype: AclType;
  topic: string;
  allow: boolean;
  priority?: number;
}

export interface RemoveRoleACLRequest {
  rolename: string;
  acltype: AclType;
  topic: string;
}

