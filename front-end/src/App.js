import "./App.css";
import { useState, useRef, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { FAUCET_CONTRACT_ADDRESS, abi } from "./constants/index";
import {
  Text,
  Flex,
  Heading,
  Box,
  useMediaQuery,
  useToast,
} from "@chakra-ui/react";
import Deposit from "./components/Deposit";
import Withdraw from "./components/Withdraw";

function App() {
  const [balance, setBalance] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const web3ModalRef = useRef();
  const [userBalance, setUserBalance] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const toast = useToast();
  const [donators, setDonators] = useState(0);
  const [mob] = useMediaQuery("(max-width: 675px)");

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new ethers.providers.Web3Provider(provider);
    const { chainId } = await web3Provider.getNetwork();
    console.log(chainId);
    if (chainId !== 11155111) {
      toast({
        position: "top-right",
        description: "Please connect to the sepolia test network",
        status: "error",
        duration: 10000,
        isClosable: true,
      });
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "sepolia",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getBalance();
    }
  }, [walletConnected]);

  const connectWallet = async () => {
    try {
      const provider = await getProviderOrSigner(true);
      setWalletConnected(true);
      const address = await provider.getAddress();
      setAccount(address);
      const balance = await provider.getBalance();
      const balanceInETH = ethers.utils.formatEther(balance);
      setUserBalance(balanceInETH);
    } catch (err) {
      console.error(err);
    }
  };

  const infuraId = "43f25644024744528d2f8e59ce7e5fab";

  const getBalance = async () => {
    try {
      const provider = new ethers.providers.InfuraProvider("sepolia", infuraId);
      const faucetContract = new ethers.Contract(
        FAUCET_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const balance = await faucetContract.getBalance();
      setBalance(ethers.utils.formatUnits(balance, 18));
    } catch (err) {
      console.error("Error calling getBalance:", err);
      if (err.data) {
        console.log("Revert reason:", ethers.utils.toUtf8String(err.data));
      }
    }
  };

  const deposit = async (value) => {
    try {
      const provider = await getProviderOrSigner(true);
      const faucetContract = new ethers.Contract(
        FAUCET_CONTRACT_ADDRESS,
        abi,
        provider
      );
      if (userBalance > value) {
        const transaction = await faucetContract.deposit({
          value: ethers.utils.parseUnits(value, "ether"),
        });
        toast({
          position: "top-right",
          description:
            "This generally takes up to 60 seconds on the sepolia Test Network. Please be patient :)",
          status: "info",
          duration: 6000,
          isClosable: true,
        });
        setLoading(true);
        await transaction.wait();
        toast({
          position: "top-right",
          description: "Deposit success, thanks for your support!",
          status: "success",
          duration: 6000,
          isClosable: true,
        });
        await getBalance();
      } else {
        toast({
          position: "top-right",
          description: "Not enough Ether",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const requestAllowed = async () => {
    try {
      const provider = await getProviderOrSigner(true);
      const faucetContract = new ethers.Contract(
        FAUCET_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const isAllowed = await faucetContract.withdrawalAllowed();
      return isAllowed;
    } catch (err) {
      console.error(err);
    }
  };

  const request = async () => {
    try {
      const provider = await getProviderOrSigner(true);
      const faucetContract = new ethers.Contract(
        FAUCET_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const checkIfAllowed = await requestAllowed();
      if (checkIfAllowed) {
        const transaction = await faucetContract.withdraw(account);
        toast({
          position: "top-right",
          description:
            "This generally takes up to 60 seconds on the sepolia Test Network. Please be patient :)",
          status: "info",
          duration: 6000,
          isClosable: true,
        });
        setLoading(true);
        await transaction.wait();
        await getBalance();
        toast({
          position: "top-right",
          description: "Request successful, have fun!",
          status: "success",
          duration: 6000,
          isClosable: true,
        });
      } else {
        toast({
          position: "top-right",
          description:
            "Already requested within the past 12 hours. Please try again later.",
          status: "error",
          duration: 6000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box bg="gray.800" textAlign="center" height={mob ? "100%" : "100vh"}>
      <Heading color="white" pt="10">
        Sepolia Faucet
      </Heading>
      <Text color="white" fontSize="18" padding="10">
        Out of ETH? Don't panic! Just click the request button on the bottom
        left hand side.
        <br />
        <br />
        We run purely on user donations from the community so please consider
        donating any spare ETH you may have to help others out.
      </Text>

      <Flex pt="10">
        <Flex
          justifyContent="space-between"
          width="800px"
          mx="auto"
          alignItems="center"
          flexDirection={mob ? "column" : "row"}
        >
          <Withdraw
            request={request}
            balance={balance}
            donators={donators}
            loading={loading}
          />

          {mob && <br />}

          <Deposit
            deposit={deposit}
            errorMessage={errorMessage}
            loading={loading}
          />
        </Flex>
      </Flex>
    </Box>
  );
}

export default App;
