// AUTH: REGISTER
type ApiAuthRegisterPayload = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

// AUTH: LOGIN
type ApiAuthLoginPayload = {
  email: string;
  password: string;
};

type ApiAuthLoginResult = {
  id: number;
  email: string;
  username: string;
};

// AUTH: CHECK DATA
type ApiAuthCheckDataPayload = {
  email?: string;
  username?: string;
};

type ApiAuthCheckDataResult = {
  id: number;
}[];
