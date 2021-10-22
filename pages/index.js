// https://stackoverflow.com/questions/68085393/web3-get-all-tokens-by-wallet-address
import { useState, useEffect } from "react";
import styled from "styled-components";
import Web3 from "web3";
import ENS, { getEnsAddress } from "@ensdomains/ensjs";

const minABI = [
  // balanceOf
  {
    constant: true,

    inputs: [{ name: "_owner", type: "address" }],

    name: "balanceOf",

    outputs: [{ name: "balance", type: "uint256" }],

    type: "function",
  },
];

const web3 = new Web3(process.env.NEXT_PUBLIC_INFURA_KEY);

const divideByNumber = 1000000000000000000;
//Dames address
export default function Home() {
  const [yourAddress, setYourAddress] = useState("");
  const [crushAddress, setCrushAddress] = useState("");

  const [globalYourCoins, setGlobalYourCoins] = useState();
  const [globalCrushesCoins, setGlobalCrushesCoins] = useState();
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);

  const [loading, setLoading] = useState(false);

  //an function that checks if there is any matches between the users coins and the crush coins
  const checkForMatches = (yourCoins, crushCoins) => {
    console.log("Checking for matches");
    var matches = 0;
    var howManyTypesOfCoins = 0;
    // var yourCoins = { ...globalYourCoins };
    // var crushCoins = { ...globalCrushesCoins };

    //get length of object
    var yourCoinLength = Object.keys(yourCoins).length;
    var crushCoinLength = Object.keys(crushCoins).length;

    howManyTypesOfCoins = yourCoinLength + crushCoinLength;

    yourCoins = sortCoins(yourCoins);
    crushCoins = sortCoins(crushCoins);

    for (let coin in yourCoins) {
      // console.log("Your Coin", coin);
      for (let coin2 in crushCoins) {
        if (coin === coin2) {
          matches++;
          crushCoins[coin].hasMatch = true;
          yourCoins[coin].hasMatch = true;
        }
      }
    }
    //we subtract the matches from the count so they dont get counted twice
    howManyTypesOfCoins = howManyTypesOfCoins - matches;

    console.log("Your Coins", yourCoins);
    console.log("Crush Coins", crushCoins);
    console.log("Matches", matches);
    console.log("How Many Types of Coins", howManyTypesOfCoins);

    return { matches, howManyTypesOfCoins, yourCoins, crushCoins };
  };

  //an function that orders the coins by key name and then by value
  const sortCoins = (coins) => {
    const sortedCoins = {};
    Object.keys(coins)
      .sort()
      .forEach((key) => {
        sortedCoins[key] = coins[key];
      });
    return sortedCoins;
  };

  const ENS_To_Address = async (ensName) => {
    var web3 = new Web3(
      new Web3.providers.HttpProvider(process.env.NEXT_PUBLIC_INFURA_KEY)
    );
    const ens = new ENS({
      provider: web3.currentProvider,
      ensAddress: getEnsAddress("1"),
    });
    console.log("ENS", ens.name(ensName).getAddress());
    if (
      (await ens.name(ensName).getAddress()) ==
      "0x0000000000000000000000000000000000000000"
    ) {
      alert("ENS domain points to 0x0000000000000000000000000000000000000000");
      return false;
    }

    return await ens.name(ensName).getAddress();
  };

  const checkIfAddressIsValid = async (address) => {
    let re = /^0x[a-fA-F0-9]{40}$/;
    let re2 = /^[a-fA-F0-9]{40}$/;

    //Check if input contains .eth aka an ENS Domain
    if (address === "0x0000000000000000000000000000000000000000") {
      alert("");
      return false;
    } else if (address.includes(".eth")) {
      return await ENS_To_Address(address);
    }
    //If it doesnt contain .eth check if it is a valid address
    else if (re.test(address) || re2.test(address)) {
      return address;
    }
    //if it is not a valid address we return false
    else {
      return false;
    }
  };

  const FindLove = async () => {
    setLoading(true);
    const tempYours = await checkIfAddressIsValid(yourAddress);
    const tempCrush = await checkIfAddressIsValid(crushAddress);

    console.log("tempYours", tempYours);
    console.log("tempCrush", tempCrush);

    //if both are valid addresses we can continue
    if (tempYours && tempCrush) {
      const yourCoinList = await getAllCoinTransactions(tempYours);
      const crushCoinList = await getAllCoinTransactions(tempCrush);

      console.log("yourCoinList", yourCoinList);
      console.log("crushCoinList", crushCoinList);
      const { matches, howManyTypesOfCoins, yourCoins, crushCoins } =
        checkForMatches(yourCoinList, crushCoinList);

      setGlobalCrushesCoins(crushCoins);
      setGlobalYourCoins(yourCoins);
      setTotalMatches(matches);
      setTotalCoins(howManyTypesOfCoins);
    }

    setLoading(false);
  };

  const getAllCoinTransactions = async (address) => {
    try {
      const fetchURL = `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&sort=desc&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`;
      var response = await fetch(fetchURL);

      const coinMapping = {};

      response = await response.json();
      let tokenList = response.result;
      console.log("address", address);
      console.log("response", tokenList);
      tokenList = tokenList.filter(
        (ele, ind) =>
          ind ===
          tokenList.findIndex(
            (elem) => elem.contractAddress === ele.contractAddress
          )
      );

      for (let token of tokenList) {
        coinMapping[token.tokenSymbol] = {
          coinAmount: await getERC20TokenCount(token.contractAddress, address),
          hasMatch: false,
        };
      }

      return coinMapping;
    } catch (err) {
      alert(err);
    }
  };

  //go through token addresses and get balance for wallet
  //  //https://www.quicknode.com/guides/web3-sdks/how-to-get-the-balance-of-an-erc-20-token
  const getERC20TokenCount = async (tokenAddress, walletAddress) => {
    const contract = new web3.eth.Contract(minABI, tokenAddress);

    const tokenBalance = await contract.methods.balanceOf(walletAddress).call();
    return +tokenBalance / divideByNumber;
  };

  return (
    <HomeDiv>
      <LoveZone>
        <TextZone>
          <NameZone>
            <label htmlFor="yours">Your address</label>
            <input
              type="text"
              placeholder="address"
              name="yours"
              value={yourAddress}
              onChange={(e) => {
                setYourAddress(e.target.value);
              }}
            />
          </NameZone>
          <NameZone>
            <label htmlFor="crush">Crush's address</label>
            <input
              type="text"
              placeholder="address"
              name="crush"
              value={crushAddress}
              onChange={(e) => {
                setCrushAddress(e.target.value);
              }}
            />
          </NameZone>
        </TextZone>
        <button onClick={FindLove}>
          {loading ? "calculating love..." : "Find Love"}
        </button>
        {/* {totalMatches + "/" + totalCoins} ={" "}
        {(totalMatches / totalCoins) * 100 + "%"} */}

        {totalCoins !== 0 && (
          <ResultZone>
            {Math.round((totalMatches / totalCoins) * 100) + "%"}
          </ResultZone>
        )}
      </LoveZone>
      <ListZone>
        {/* <ul> */}
        <div>
          {globalYourCoins &&
            Object.keys(globalYourCoins).map((coinName, i) => (
              <CoinBox
                className="match"
                key={i}
                hasMatch={globalYourCoins[coinName].hasMatch}
              >
                {coinName}: {globalYourCoins[coinName].coinAmount}
              </CoinBox>
            ))}
        </div>
        {/* </ul> */}
        <div>
          {globalCrushesCoins &&
            Object.keys(globalCrushesCoins).map((coinName, i) => (
              <CoinBox hasMatch={globalCrushesCoins[coinName].hasMatch} key={i}>
                {coinName}: {globalCrushesCoins[coinName].coinAmount}
              </CoinBox>
            ))}
        </div>

        {/* <BoxTexT hasMatch></BoxTexT> */}
      </ListZone>
      <Footer>
        Made with ✨ by{" "}
        <a href="https://www.twitter.com/berbaroovez">berbaroovez</a>
      </Footer>
    </HomeDiv>
  );
}

const Footer = styled.footer`
  text-align: center;
`;
const ResultZone = styled.div`
  //a heart background gradient
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  background-image: url("/heart.png");
  background-size: cover;

  width: 200px;
  height: 200px;
  justify-self: center;
`;

const CoinBox = styled.div`
  background: ${(props) => (props.hasMatch ? "#A5F5A5" : "#F5A5A5")};
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
  width: 250px;
`;

const ListZone = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
`;
const HomeDiv = styled.div`
  width: 80%;
  margin: 0 auto;
  max-width: 600px;
  padding-top: 100px;
`;

const TextZone = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const LoveZone = styled.div`
  display: grid;

  /* flex-direction: column; */
  /* justify-content: center; */
  /* align-items: center; */
  button {
    justify-self: center;
    width: 200px;
    border-radius: 5px;
    border: none;
    padding: 5px 2px;
    font-size: 1.5rem;
    font-weight: bold;
    background: #f5f5f5;

    :hover {
      background: #c0c0c0;
      cursor: pointer;
    }
  }
`;

const NameZone = styled.div`
  display: flex;
  flex-direction: column;

  input {
    width: 250px;

    border-radius: 10px;
    padding: 10px;
    border: 1px solid #ccc;
  }
`;
